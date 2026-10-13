from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps, ImageFilter
import json

root=Path(__file__).parent
assets=root/'assets'; refs=root/'references'
W,H=1024,1536
hero=Image.open(refs/'sage-fullportrait.png').convert('RGBA')
hero=hero.crop(hero.getchannel('A').getbbox())
hero=hero.resize((round(hero.width*1240/hero.height),1240),Image.Resampling.LANCZOS)
subject=Image.new('RGBA',(W,H))
subject.alpha_composite(hero,((W-hero.width)//2,48))
subject.save(assets/'subject.png')
edges=subject.convert('RGB').convert('L').filter(ImageFilter.FIND_EDGES)
ink=ImageOps.invert(edges).point(lambda v: 0 if v<195 else 255)
ink=Image.composite(ink,Image.new('L',(W,H),255),subject.getchannel('A'))
ink.convert('RGB').save(assets/'lineart.png')

# Quiet crop of the official agent-page backdrop: retain the real game's field and accents.
official=Image.open(refs/'sage-official.png').convert('RGB')
background=official.crop((250,0,1431,1772)).resize((W,H),Image.Resampling.LANCZOS)
background.save(assets/'background.png')

font_path='C:/Windows/Fonts/msyhbd.ttc'
english_path='C:/Windows/Fonts/arialbd.ttf'
text=Image.new('RGBA',(W,H)); d=ImageDraw.Draw(text)
jade=(107,223,198,255); white=(238,248,246,255); muted=(147,187,181,255)
d.rounded_rectangle((25,25,999,1511),radius=25,outline=(90,173,158,240),width=3)
d.rectangle((310,0,780,35),fill=(0,0,0,0))
d.line((52,128,205,128),fill=jade,width=4)
d.text((55,57),'VALORANT',font=ImageFont.truetype(english_path,26),fill=white)
d.text((60,94),'07 / SENTINEL',font=ImageFont.truetype(english_path,16),fill=muted)
d.rounded_rectangle((64,1296,960,1492),radius=16,fill=(15,32,37,245),outline=jade,width=2)
d.text((512,1350),'贤者',font=ImageFont.truetype(font_path,78),fill=white,anchor='mm')
d.text((512,1422),'SAGE  /  生机不息',font=ImageFont.truetype(font_path,26),fill=jade,anchor='mm')
d.text((105,1470),'No.005',font=ImageFont.truetype(english_path,18),fill=muted,anchor='lm')
d.text((921,1470),'JADE ECHO',font=ImageFont.truetype(english_path,18),fill=muted,anchor='rm')
text.save(assets/'text.png')

back=background.copy()
wallpaper=Image.open(refs/'VALORANT_Sage_dark.jpg').convert('RGB')
poster=ImageOps.fit(wallpaper,(900,1030),Image.Resampling.LANCZOS,centering=(.34,.5))
back.paste(poster,(62,260))
db=ImageDraw.Draw(back)
db.rounded_rectangle((28,28,996,1508),radius=24,outline=(99,203,181),width=3)
db.rectangle((61,259,963,1292),outline=(83,164,151),width=2)
db.line((360,229,664,229),fill=(83,164,151),width=2)
db.line((360,1310,664,1310),fill=(83,164,151),width=2)
back.save(assets/'back.png')

config={
 'title':'贤者','subtitle':'SAGE · 生机不息','technique':'生机不息','edition':'No.005',
 'collection':'JADE ECHO','description':'掌心凝聚治愈法球，守护队友，逆转战局。',
 'font':font_path,'sourceMode':'relief','assets':{'back':'./assets/back.png'},
 'appearance':{'finish':'silver','background':'#f4f8f6'},
 'parameters':{'subjectScale':1,'subjectDepth':.32,'effectsDepth':.48,'backgroundDepth':-.22,'foil':.18},
 'safeArea':{'scale':1,'offset':[0,0]},
 'layers':{'subject':{'width':6.9,'height':10.35,'depth':.32,'offset':[0,.35]},
           'text':{'depth':.62,'crop':[0,0,1024,1280]},
           'textTitle':{'width':6.0,'height':1.47,'offset':[0,-3.85],'crop':[0,1280,1024,1536]}},
 'backDesign':{'primary':'#e8f7f2','secondary':'#75cbb9'},
 'ui':{'brandName':'玉境','brandEnglish':'JADE ATELIER',
       'palette':{'ink':'#193b36','muted':'#6b8580','accent':'#258e7b','focus':'#227e6d','control':'#eaf3ef','line':'#d5e5dd'},
       'fonts':{'display':'"Microsoft YaHei", "PingFang SC", sans-serif','body':'"Microsoft YaHei", sans-serif'}},
 'artDirection':{'medium':'官方游戏角色立绘与壁纸',
    'observations':'白色战术长袍、黑色马尾与裤装、玉青法球；原画为锐利分面绘画，官网背景为深灰蓝与少量品牌红点。',
    'designIntent':'保留网络角色原图，采用细玉青边框、清晰无衬线排版、低强度银箔；背面使用 Riot 官方贤者壁纸。',
    'reviewNotes':[]}}
(root/'card-config.json').write_text(json.dumps(config,ensure_ascii=False,indent=2),encoding='utf8')
(root/'sources.md').write_text('''# 素材来源

- 角色：Riot Games《VALORANT》贤者原画；透明立绘由 VALORANT-API 社区镜像提供。
  https://media.valorant-api.com/agents/569fdd95-4d10-43ab-ca70-79becc718b46/fullportrait.png
  检索入口：https://valoranthub.com/agents/sage
- 角色核对与背景：Riot 官方贤者页面。
  https://playvalorant.com/en-us/agents/sage/
- 背面：Riot 官方媒体页的 Sage Wallpaper，使用 VALORANT_Sage_dark.jpg。
  https://playvalorant.com/en-us/media/
  https://cmsassets.rgpub.io/sanity/files/dsfx7636/news/36f65336a0f5da6708891fb5f7df45e947322a6d.zip
- 原始网络文件保留在 references/，下载地址记录在 references/sources.json。
- 本卡没有使用 AI 生成的角色、背景或背面。排版、边框、尺寸适配与线稿由脚本完成。
- 本作是个人制作的展示卡，不代表 Riot 官方发行。原始图片版权归 Riot Games。
''',encoding='utf8')
print('Prepared Sage artwork:',root)
