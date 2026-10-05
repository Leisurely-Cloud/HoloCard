export function createBackCanvas(config, image) {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 1536;
  const ctx = c.getContext("2d");
  if (image) {
    ctx.drawImage(image, 0, 0, 1024, 1536);
    ctx.textAlign = "center";
    ctx.fillStyle = config.backDesign?.secondary || "#82b3d2";
    ctx.font = "500 19px Arial";
    ctx.fillText(config.collection || "ART COLLECTION", 512, 122);
    ctx.fillStyle = config.backDesign?.primary || "#d6edff";
    ctx.font = '600 42px "Microsoft YaHei", sans-serif';
    ctx.fillText(config.title, 512, 195);
    ctx.font = '23px "Microsoft YaHei", sans-serif';
    ctx.fillText(config.subtitle || "", 512, 1370);
    ctx.fillStyle = config.backDesign?.secondary || "#82b3d2";
    ctx.font = "500 19px Arial";
    ctx.fillText(`${config.edition || ""}  /  PERSONAL COLLECTION`, 512, 1420);
    return c;
  }
  ctx.strokeStyle = "#aeb5aa";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(56, 56, 912, 1424);
  ctx.strokeRect(72, 72, 880, 1392);
  ctx.textAlign = "center";
  ctx.fillStyle = "#50594e";
  ctx.font = "500 420px Atelier, Georgia, serif";
  ctx.fillText((config.title || "A").slice(0, 1), 512, 846);
  ctx.font = "24px Arial";
  ctx.fillStyle = "#737b70";
  ctx.fillText(config.collection || "WHITE ATELIER", 512, 245);
  ctx.font = '34px "Songti SC", serif';
  ctx.fillText(config.subtitle || config.title, 512, 1020);
  ctx.font = "18px Arial";
  ctx.fillText(config.edition || "ART STUDY", 512, 1337);
  ctx.beginPath();
  ctx.moveTo(460, 1113);
  ctx.lineTo(564, 1113);
  ctx.stroke();
  return c;
}
