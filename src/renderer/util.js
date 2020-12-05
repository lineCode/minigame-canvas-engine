import { SCALE_KEY } from './const.js';

const IMAGE_POOL = Object.create(null);

export function createImageLoader(createImage) {
  return function (src, cb = () => {}) {
    if (IMAGE_POOL[src]) {
      if (IMAGE_POOL[src].loaded) {
        cb(IMAGE_POOL[src].image);
      } else {
        IMAGE_POOL[src].onloads.push(cb);
      }
    } else {
      const img = createImage();
      IMAGE_POOL[src] = { image: img, loaded: false, onloads: [cb] };
      img.onload = () => {
        IMAGE_POOL[src].loaded = true;
        IMAGE_POOL[src].onloads.pop()(IMAGE_POOL[src].image, true);
        IMAGE_POOL[src].onloads = [];
      };
      img.onerror = () => {};
      // img.setSrc(src);

      img.src = src;
    }
  };
}

const BGIMAGE_RECT_CACHE = Object.create(null);

function getBgImageRect(
  { src, width, height },
  size,
  position,
  borderWidth,
  [baseX, baseY, boxWidth, boxHeight],
  dpr = 2
) {
  const key = `${src}_${size}_${position}_${borderWidth}_${baseX}_${baseY}_${boxWidth}_${boxHeight}`;

  if (BGIMAGE_RECT_CACHE[key]) {
    return BGIMAGE_RECT_CACHE[key];
  }

  let finalX = baseX - borderWidth;
  let finalY = baseY - borderWidth;

  if (size) {
    const splitVal = size.split(' ');
    if (splitVal.length === 2) {
      const setWidth = splitVal[0];
      const setHeight = splitVal[1];
      width = setWidth[setWidth.length - 1] === '%' ? (boxWidth * parseFloat(setWidth.slice(0, -1))) / 100 : parseFloat(setWidth) * dpr;
      height = setHeight[setHeight.length - 1] === '%' ? (boxHeight * parseFloat(setHeight.slice(0, -1))) / 100 : parseFloat(setHeight) * dpr;
    } else if (splitVal.length === 1) {
      const imgRatio = width / height;
      const boxRatio = boxWidth / boxHeight;
      switch (splitVal[0]) {
        case 'contain':
          if (imgRatio < boxRatio) {
            height = boxHeight;
            width = height * imgRatio;
            if (!position) {
              finalY = baseY;
              finalX = baseX + (boxWidth - width) / 2;
            }
          } else {
            width = boxWidth;
            height = width / imgRatio;
            if (!position) {
              finalX = baseX;
              finalY = baseY + (boxHeight - height) / 2;
            }
          }
          break;
        case 'cover':
          if (imgRatio < boxRatio) {
            width = boxWidth;
            height = width / imgRatio;
            if (!position) {
              finalX = baseX;
              finalY = baseY - (height - boxHeight) / 2;
            }
          } else {
            height = boxHeight;
            width = height * imgRatio;
            if (!position) {
              finalY = baseY;
              finalX = baseX - (width - boxWidth) / 2;
            }
          }
          break;
      }
    }
    if (position) {
      let [x, y] = position.split(' ');
      switch (x) {
        case 'left':
          x = '0%';
          break;
        case 'center':
          x = '50%';
          break;
        case 'right':
          x = '100%';
      }
      switch (y) {
        case 'top':
          y = '0%';
          break;
        case 'center':
          y = '50%';
          break;
        case 'bottom':
          y = '100%';
      }
      x = x[x.length - 1] === '%' ? ((boxWidth - width) * parseFloat(x.slice(0, -1))) / 100 : parseFloat(x) * dpr;
      y = y[y.length - 1] === '%' ? ((boxHeight - height) * parseFloat(y.slice(0, -1))) / 100 : parseFloat(y) * dpr;
      finalX += x;
      finalY += y;
    }
  }

  BGIMAGE_RECT_CACHE[key] = [finalX - baseX, finalY - baseY, width, height];

  return BGIMAGE_RECT_CACHE[key];
}

const TEXT_TEXTURE = Object.create(null);

export function createTextTexture(createCanvas) {
  return function ([x, y, width, height], { valueShow, valueBreak }, style, dpr = 2) {
    style.font = `${style.fontWeight || ''} ${style.fontSize * dpr}px ${style.fontFamily}`;

    const key = `${x}_${y}_${width}_${height}_${valueShow}_${style.font}_${style.lineHeight}_${style.textAlign}_${style.textShadow}_${style.whiteSpace}_${style.textOverflow}_${style.color}`;

    if (TEXT_TEXTURE[key]) {
      return TEXT_TEXTURE[key];
    }

    const canvas = createCanvas();
    const ctx = canvas.getContext('2d');

    canvas.width = Math.ceil(width);
    canvas.height = Math.ceil(height);

    ctx.save();
    // ctx.fillStyle = 'red';
    // ctx.fillRect(0, 0, width, height);

    ctx.textBaseline = 'top';
    ctx.font = style.font;
    ctx.textAlign = style.textAlign;
    ctx.fillStyle = style.color;

    if (style.textShadow) {
      const [offsetX, offsetY, shadowBlur, shadowColor] = style.textShadow.split(' ');
      ctx.shadowOffsetX = +offsetX * dpr;
      ctx.shadowOffsetY = +offsetY * dpr;
      ctx.shadowBlur = +shadowBlur * dpr;
      ctx.shadowColor = shadowColor;
    }

    let drawX = 0;
    let drawY = style.drawY * dpr - y;

    if (style.textAlign === 'center') {
      drawX += width / 2;
    } else if (style.textAlign === 'right') {
      drawX += width;
    }

    if (style.lineHeight) {
      ctx.textBaseline = 'middle';
      drawY += (style.lineHeight * dpr) / 2;
    }

    if (style.whiteSpace === 'nowrap' && style.textOverflow !== 'ellipsis') { // 不换行的时候，直接溢出处理
      ctx.fillText(
        valueShow,
        drawX,
        drawY,
      );
    } else {
      if (valueBreak && valueBreak.length) {
        for (let i = 0; i < valueBreak.length; i++) {
          const str = valueBreak[i];
          ctx.fillText(str, drawX, drawY);
          drawY += (style.lineHeight || style.fontSize) * dpr;
        }
      } else {
        ctx.fillText(
          valueShow,
          drawX,
          drawY,
        );
      }
    }
    ctx.restore();

    TEXT_TEXTURE[key] = canvas;
    return TEXT_TEXTURE[key];
  };
}

/**
 * 处理渲染相关数据的分辨率
 * @param {Object} data [render数据]
 * @param {Number} dpr [分辨率]
 */
function scaleData(data, dpr) {
  const newData = Object.assign({}, data);
  SCALE_KEY.forEach((key) => {
    if (typeof newData[key] === 'number') {
      newData[key] *= dpr;
    } else if (Array.isArray(newData[key])) {
      newData[key] = newData[key].map(v => v * dpr);
    }
  });
  return newData;
}

export const VIDEOS = Object.create(null);

export function createRender({ dpr, createImage, createCanvas }) {
  const loadImage = createImageLoader(createImage);
  const getTextTexture = createTextTexture(createCanvas);
  return {
    loadImage,
    repaint: function drawRects(gl, glRects) {
      // console.log('createRender repaint call');
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
      glRects.forEach((d, idx) => {
        const glRectData = scaleData(d, dpr);
        // console.log(JSON.stringify(glRectData));
        const glRect = gl.createRoundRect(idx);
        const dimension = [glRectData.x, glRectData.y, glRectData.width, glRectData.height];
        glRect.updateContours(dimension);
        glRectData.radius && glRect.setRadius(glRectData.radius);
        glRectData.backgroundColor && glRect.setBackgroundColor(glRectData.backgroundColor);
        glRectData.borderWidth && glRect.setBorder(glRectData.borderWidth, glRectData.borderColor);
        if (glRectData.image) {
          const { src } = glRectData.image;
          loadImage(src, (image, lazy) => {
            glRect.setTexture({ image });
            if (lazy) {
              drawRects(gl, glRects);
            }
          });
        }
        if (glRectData.backgroundImage) {
          const { src, size, position } = glRectData.backgroundImage;
          loadImage(src, (image, lazy) => {
            const rect = getBgImageRect(image, size, position, glRectData.borderWidth || 0, dimension, dpr);
            glRect.setTexture({ image, rect });
            if (lazy) {
              drawRects(gl, glRects);
            }
          });
        }
        if (glRectData.text) {
          glRect.setTexture({ image: getTextTexture(dimension, glRectData.text.value, glRectData.text.style, dpr) });
        }
        if (glRectData.type === 'Video') {
          const video = VIDEOS[`${gl.canvas.id}-${glRectData.id}`];

          if (video) {
            video.repaint = () => drawRects(gl, glRects);

            if (video.iData) {
              glRect.setTextureData({ imageData: video.iData, width: video.vWidth, height: video.vHeight });
            }
          }
        }
        glRect.updateViewPort();
        glRect.draw();
      });
    },
  };
}

/**
 * 像素点采样检测渲染异常，随机采样count个像素点，如果像素点中超过90%是相同的，则认为是有异常的
 * @param {Object} gl
 * @param {Number} count [采样点的数量]
 */
export function renderDetection(gl, count) {
  const { width } = gl.canvas;
  const { height } = gl.canvas;
  let pixels = new Uint8Array(width * height * 3);
  gl.readPixels(0, 0, width, height, gl.RGB, gl.UNSIGNED_BYTE, pixels);

  // const result = [];
  const map = {};
  let maxKey = '';
  for (let i = 0; i < count; i++) {
    const row = Math.random() * width; // 取一行
    const column = Math.random() * height; // 取一列
    const p = 3 * row * width + 3 * column;
    const key = `${pixels[p]}_${pixels[p + 1]}_${pixels[p + 2]}`;
    // result.push(mapData);
    if (map[key]) {
      map[key] += 1;
      if (map[key] > map[maxKey]) {
        maxKey = key;
      }
    } else {
      map[key] = 1;
    }
  }
  pixels = null;
  if (map[maxKey] / count > 0.9) {
    return false;
  }
  return true;
}