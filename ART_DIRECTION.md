# FALLWELL 美术规范与素材清单

## 方向

原创深井探险像素美术。暖白面罩、黄铜头盔与枪靴突出主角；青绿提示可踩，珊瑚红提示危险，黄铜龟壳提示抗子弹。背景低对比，不用亮装饰掩盖弹丸与敌人。平台顶面是实际碰撞位置，以青绿细线标出。

## 本次素材

- `public/assets/art/characters-v1.png`：16 格透明原始图集，含四个角色姿态、六种敌人、Boss、晶石、子弹、可破坏石块、尖刺、医疗心形图标。
- `public/assets/art/characters-v1.webp`：无损压缩的运行时图集，保留透明通道。
- `public/assets/art/biomes-v1.png`：四区原始背景图。
- `public/assets/art/biomes-v1.webp`：运行时压缩背景。
- `public/assets/icons/*.svg`：12 个独立升级图标，项目内原创矢量图，黄铜 / 青绿 / 红色语义一致。
- `src/art.ts`：素材清单、透明边界检测、帧注册、共享角色尺度、脚底锚点、动画与精灵池；石砖纹理按区域确定性绘制。

## 生产方式

角色 / 敌人 / 背景使用内置 image_gen 生成。精灵图集经过一次图像编辑：保持设计，只缩小并重新居中，修正 Boss / 蝙蝠侵入相邻格的问题。未提取 Downwell 原版素材。

运行时直接检测每格的 alpha 边界以注册 Phaser 帧，不依赖原图空白边距。角色三个地面姿态共用尺度，脚底对齐碰撞面；射击姿态的枪靴火焰仅在开火时出现。敌人保持原有独立碰撞尺寸。背景以低速视差滚动，透明度约 58%。美术替换不修改关卡、伤害与资源规则。

## 提示词归档

1. 初始角色图集："Production game sprite atlas for an original vertical falling roguelite named FALLWELL. Perfect regular 4 columns by 4 rows atlas on genuinely transparent canvas, each object centered with wide padding. Crisp handcrafted 16-bit pixel art, controlled palette, dark ink outlines. Row 1 same brass-helmet cave explorer: idle, two running poses, airborne shooting. Row 2 mint slime, teal bat, coral spiked beetle, violet sentry. Row 3 gold turtle, red spectral ghost, ancient stone-brass guardian, teal crystal. Row 4 gold downward bullet, cracked rock, coral spike strip, heart medkit. No text, labels, grid or scenery."
2. 图集修正："Preserve every character identity, design, color, pose, and ordering. Change only layout spacing and sizes. Exact equal 4-column 4-row grid. Every sprite within central 55% width and 65% height, wide transparent gutters. Shrink boss, bat and ghost to fit. Preserve shared player body scale."
3. 背景："Production side-view 16-bit pixel-art well backgrounds, four equal vertical panels: teal mineral cave, violet catacombs, navy submerged stone, near-black purple abyss. Dark controlled palette and restrained detail, less detail in middle for readability; matching top/bottom edges for vertical tiling. No platforms, foreground, characters, enemies, UI, text or logos."

以上为实际提示词的规范化归档，生成器使用内置工具；运行时图集无损 WebP，背景使用 WebP 质量 88。所有实际素材均保存在项目中。
