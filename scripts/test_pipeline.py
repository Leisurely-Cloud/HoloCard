"""Regression checks for assembly boundaries and build failures."""
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch
from project_config import web_config, load_config, validate_config
from viewer_build import assemble_viewer, bundle_viewer
from run_pipeline import run_pipeline


class PipelineTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / 'assets').mkdir()
        (self.root / 'card-config.json').write_text(json.dumps({'title':'Test', 'ui':{'brandName':'Custom'}}), encoding='utf8')

    def test_optional_layers_come_from_files_and_preserve_metadata(self):
        (self.root / 'assets/back.png').write_bytes(b'back fixture')
        config = web_config(self.root)
        self.assertIn('back', config['assets'])
        self.assertNotIn('effects', config['assets'])
        self.assertEqual(config['ui']['brandName'], 'Custom')
        (self.root / 'assets/back.png').unlink()
        self.assertNotIn('back', web_config(self.root)['assets'])

    def test_non_object_config_is_rejected(self):
        (self.root / 'card-config.json').write_text('[]', encoding='utf8')
        with self.assertRaisesRegex(ValueError, 'JSON object'):
            load_config(self.root)

    def test_invalid_config_identifies_the_field(self):
        cases = [
            ({}, 'title'),
            ({'title': '  '}, 'title'),
            ({'subtitle': 7}, 'subtitle'),
            ({'parameters': []}, 'parameters'),
            ({'parameters': {'subjectScale': '1.2'}}, 'parameters.subjectScale'),
            ({'parameters': {'subjectScale': False}}, 'parameters.subjectScale'),
            ({'parameters': {'subjectScale': 0}}, 'parameters.subjectScale'),
            ({'parameters': {'effectsScale': -1}}, 'parameters.effectsScale'),
            ({'parameters': {'subjectDepth': float('nan')}}, 'parameters.subjectDepth'),
            ({'parameters': {'backgroundDepth': float('inf')}}, 'parameters.backgroundDepth'),
            ({'parameters': {'foil': 1.01}}, 'parameters.foil'),
            ({'parameters': {'foil': -.01}}, 'parameters.foil'),
            ({'safeArea': {'scale': 0}}, 'safeArea.scale'),
            ({'safeArea': {'offset': [0]}}, 'safeArea.offset'),
            ({'safeArea': {'offset': [0, None]}}, 'safeArea.offset[1]'),
            ({'artworkFit': [1, 0]}, 'artworkFit[1]'),
            ({'layers': None}, 'layers'),
            ({'layers': {'subject': []}}, 'layers.subject'),
            ({'layers': {'subject': {'width': -1}}}, 'layers.subject.width'),
            ({'layers': {'text': {'crop': [0, 0, 0, 12]}}}, 'layers.text.crop'),
            ({'layers': {'text': {'crop': [-1, 0, 12, 12]}}}, 'layers.text.crop'),
            ({'sourceMode': 'typo'}, 'sourceMode'),
            ({'assets': {'back': False}}, 'assets.back'),
            ({'appearance': {'finish': 'typo'}}, 'appearance.finish'),
            ({'backDesign': {'primary': 7}}, 'backDesign.primary'),
            ({'ui': {'palette': []}}, 'ui.palette'),
            ({'ui': {'palette': {'accent': 7}}}, 'ui.palette.accent'),
        ]
        for patch_config, field in cases:
            with self.subTest(config=patch_config):
                config = {'title': 'Test', **patch_config}
                if not patch_config:
                    config = {}
                with self.assertRaises(ValueError) as error:
                    validate_config(config)
                self.assertIn(field, str(error.exception))

    def test_optional_defaults_and_custom_metadata_are_preserved(self):
        minimal = {'title': 'Test'}
        self.assertEqual(validate_config(minimal), minimal)
        config = {'title': 'Test', 'custom': {'author': 'User'},
                  'parameters': {'foil': 0, 'subjectScale': 2, 'effectsDepth': -2},
                  'layers': {'subject': {'width': 6.9, 'offset': [0, -.2]},
                             'textTitle': {'crop': [0, 1280, 1024, 1536]}},
                  'sourceMode': 'relief', 'appearance': {'finish': 'original'}}
        self.assertIs(validate_config(config), config)
        self.assertEqual(config['custom'], {'author': 'User'})
        for mode in ('composite', 'reference', 'relief'):
            validate_config({'title': 'Test', 'sourceMode': mode, 'parameters': {'foil': 1}})

    def test_json_error_includes_location_and_bom_is_supported(self):
        path = self.root / 'card-config.json'
        path.write_text('{"title":\n!}', encoding='utf8')
        with self.assertRaisesRegex(ValueError, 'invalid JSON at line 2, column 1'):
            load_config(self.root)
        path.write_text('{"title": "Test"}', encoding='utf-8-sig')
        self.assertEqual(load_config(self.root)['title'], 'Test')

    def test_invalid_config_stops_before_typography_or_blender(self):
        path = self.root / 'card-config.json'
        path.write_text('{"title": "Test", "parameters": {"foil": 2}}', encoding='utf8')
        with patch('run_pipeline.create') as typography, patch('run_pipeline.ensure_blender') as blender:
            with self.assertRaisesRegex(ValueError, 'parameters.foil'):
                run_pipeline(self.root)
            typography.assert_not_called()
            blender.assert_not_called()

    def test_cli_reports_config_errors_without_a_traceback(self):
        (self.root / 'card-config.json').write_text('{"title": "Test", "parameters": {"foil": 2}}')
        result = subprocess.run([sys.executable, str(Path(__file__).with_name('run_pipeline.py')),
                                 '--project', str(self.root)], capture_output=True, text=True)
        self.assertEqual(result.returncode, 2)
        self.assertIn('parameters.foil', result.stderr)
        self.assertNotIn('Traceback', result.stderr)

    def test_project_fonts_are_validated_and_art_direction_is_preserved(self):
        config = {'title': 'Ink card', 'ui': {'fonts': {'display': 'KaiTi, serif', 'body': 'sans-serif'}},
                  'artDirection': {'medium': 'ink', 'observations': 'fine contours'}}
        self.assertEqual(validate_config(config), config)
        for fonts in ([], {'display': 42}, {'body': False}):
            with self.subTest(fonts=fonts), self.assertRaisesRegex(ValueError, 'ui.fonts'):
                validate_config({'title': 'Test', 'ui': {'fonts': fonts}})

    def test_assembly_preserves_model_and_omits_template_caches(self):
        for name in ['subject','background','lineart','text','back']:
            (self.root / 'assets' / f'{name}.png').write_bytes(name.encode())
        template = self.root / 'template'
        (template / 'node_modules').mkdir(parents=True)
        (template / 'node_modules/ignored.txt').write_text('cache')
        (template / 'app.js').write_text('entry')
        web = self.root / 'web'
        (web / 'assets').mkdir(parents=True)
        (web / 'assets/card.glb').write_bytes(b'exported model')
        assemble_viewer(self.root, template)
        self.assertEqual((web / 'assets/card.glb').read_bytes(), b'exported model')
        self.assertFalse((web / 'node_modules/ignored.txt').exists())
        self.assertEqual((web / 'assets/back.png').read_bytes(), b'back')

    def test_rebuild_removes_only_cancelled_optional_artwork(self):
        for name in ['subject', 'background', 'lineart', 'text', 'back', 'effects']:
            (self.root / 'assets' / f'{name}.png').write_bytes(name.encode())
        template = self.root / 'template'
        template.mkdir()
        (template / 'app.js').write_text('entry')
        web = assemble_viewer(self.root, template)
        (web / 'assets/card.glb').write_bytes(b'model')
        (web / 'assets/custom.txt').write_text('custom')
        (web / 'node_modules').mkdir()
        (web / 'node_modules/keep.txt').write_text('dependency')
        (self.root / 'assets/back.png').unlink()
        (self.root / 'assets/subject.png').write_bytes(b'updated subject')
        assemble_viewer(self.root, template)
        self.assertFalse((web / 'assets/back.png').exists())
        self.assertEqual((web / 'assets/effects.png').read_bytes(), b'effects')
        self.assertEqual((web / 'assets/subject.png').read_bytes(), b'updated subject')
        (self.root / 'assets/effects.png').unlink()
        assemble_viewer(self.root, template)
        self.assertFalse((web / 'assets/effects.png').exists())
        config = json.loads((web / 'card-config.json').read_text(encoding='utf8'))
        self.assertNotIn('back', config['assets'])
        self.assertNotIn('effects', config['assets'])
        self.assertEqual((web / 'assets/card.glb').read_bytes(), b'model')
        self.assertEqual((web / 'assets/custom.txt').read_text(), 'custom')
        self.assertEqual((web / 'node_modules/keep.txt').read_text(), 'dependency')
        (self.root / 'assets/back.png').write_bytes(b'new back')
        assemble_viewer(self.root, template)
        self.assertEqual((web / 'assets/back.png').read_bytes(), b'new back')

    def test_invalid_config_does_not_overwrite_existing_viewer(self):
        web = self.root / 'web'
        web.mkdir()
        (web / 'card-config.json').write_text('previous config')
        (self.root / 'card-config.json').write_text('{"title": "Test", "layers": false}')
        with self.assertRaisesRegex(ValueError, 'layers'):
            assemble_viewer(self.root, self.root / 'template')
        self.assertEqual((web / 'card-config.json').read_text(), 'previous config')

    def test_failed_bundle_propagates_instead_of_using_stale_output(self):
        with patch('viewer_build.shutil.which', return_value='bun'), patch('viewer_build.subprocess.run', side_effect=subprocess.CalledProcessError(1, ['bun'])):
            with self.assertRaises(subprocess.CalledProcessError):
                bundle_viewer(self.root)

    def test_invalid_assets_stop_before_blender_is_started(self):
        (self.root / 'assets/text.png').write_bytes(b'fixture')
        with patch('run_pipeline.validate', side_effect=ValueError('invalid artwork')), patch('run_pipeline.ensure_blender') as blender:
            with self.assertRaisesRegex(ValueError, 'invalid artwork'):
                run_pipeline(self.root)
            blender.assert_not_called()


if __name__ == '__main__':
    unittest.main()
