import {MouseEvent} from 'react';

export const getDocumentScroll = () => {
  const documentScrollTop = Math.max(
    window.pageYOffset,
    document.documentElement.scrollTop,
    document.body.scrollTop
  );

  const documentScrollLeft = Math.max(
    window.pageXOffset,
    document.documentElement.scrollLeft,
    document.body.scrollLeft
  );

  return {documentScrollTop, documentScrollLeft};
};

export function getBoundsForNode(
  node,
  containerScroll = {scrollTop: 0, scrollLeft: 0}
) {
  const {scrollTop, scrollLeft} = containerScroll;

  return Array.from(node.getClientRects()).map((rect) => ({
    top: rect.top + scrollTop,
    left: rect.left + scrollLeft,
    offsetWidth: node.offsetWidth,
    offsetHeight: node.offsetHeight,
    width: rect.width,
    height: rect.height,
  }));
}

const propertiesToNormalize = ['pageX', 'pageY', 'clientX', 'clientY'];

function patchEventProperties(evt, touchKey) {
  propertiesToNormalize.forEach((key) => {
    if (typeof evt[key] === 'undefined') {
      evt[key] = evt[touchKey][0][key];
    }
  });
}

/**
 * Used to return event object with desktop (non-touch) format of event
 * coordinates, regardless of whether the action is from mobile or desktop.
 */
export function castTouchToMouseEvent(evt) {
  if (evt.type.includes('mouse')) {
    return evt;
  }

  try {
    if (evt.type === 'touchstart') {
      patchEventProperties(evt, 'targetTouches');
    } else if (evt.type === 'touchmove') {
      patchEventProperties(evt, 'changedTouches');
    }
  } catch (err) {
    console.error(err.message);
  }

  return evt;
}

export function isNodeInRoot(node, root) {
  while (node) {
    if (node === root) {
      return true;
    }

    node = node.parentNode;
  }

  return false;
}

/**
 * Given offsets, widths, and heights of two objects, determine if they collide (overlap).
 */
const areBoundsCollide = (a, b, {tolerance = 0, useOffsetSize = false}) => {
  const aHeight = useOffsetSize ? a.offsetHeight : a.height;
  const bHeight = useOffsetSize ? b.offsetHeight : b.height;

  const aWidth = useOffsetSize ? a.offsetWidth : a.width;
  const bWidth = useOffsetSize ? b.offsetWidth : b.width;

  return !(
    a.top + aHeight - tolerance < b.top ||
    // 'a' top doesn't touch 'b' bottom
    a.top + tolerance > b.top + bHeight ||
    // 'a' right doesn't touch 'b' left
    a.left + aWidth - tolerance < b.left ||
    // 'a' left doesn't touch 'b' right
    a.left + tolerance > b.left + bWidth
  );
};

function toArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  return [value];
}

/**
 * Given two objects containing "top", "left", "offsetWidth" and "offsetHeight"
 * properties, determine if they collide.
 */
export function doObjectsCollide(a, b, tolerance = 0, delta = 1) {
  const aBounds = toArray(a);
  const bBounds = toArray(b);

  for (let i = 0; i < aBounds.length; i++) {
    for (let j = 0; j < bBounds.length; j++) {
      return areBoundsCollide(aBounds[i], bBounds[j], {
        tolerance,
        useOffsetSize: delta === 1,
      });
    }
  }
}
