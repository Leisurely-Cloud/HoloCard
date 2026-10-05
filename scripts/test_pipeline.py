"""Regression checks for assembly boundaries and build failures."""
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch
from project_config import web_config, load_config
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
