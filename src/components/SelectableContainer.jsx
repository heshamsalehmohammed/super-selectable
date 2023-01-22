import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
  forwardRef,
} from 'react';
import {context} from './context';
import SelectBox from './SelectBox';
import {mergeRefs} from 'react-merge-refs';
import {
  castTouchToMouseEvent,
  doObjectsCollide,
  getBoundsForNode,
  getDocumentScroll,
  isNodeInRoot,
} from './utils';

const SelectableContainer = (props) => {
  const {children, onSelectionFinish} = props;

  const selectableRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const selectBoxRef = useRef(null);
  const mouseRef = useRef({
    current: {x: 0, y: 0},
    start: {x: 0, y: 0},
    isDragging: false,
  });
  const dataRef = useRef({
    left: 0,
    top: 0,
    scaleX: 0,
    scaleY: 0,
  });

  const mouseDownDataRef = useRef({
    selectboxY: 0,
    selectboxX: 0,
    target: null,
  });

  const containerScrollRef = useRef({
    scrollTop: 0,
    scrollLeft: 0,
  });
  const documentScrollRef = useRef({
    scrollTop: 0,
    scrollLeft: 0,
  });

  const selectboxStateRef = useRef({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });

  const selectboxBoundsRef = useRef({
    top: 0,
    left: 0,
    width: 0,
    height: 0,
    offsetWidth: 0,
    offsetHeight: 0,
  });

  const maxScrollTopRef = useRef(0);

  const maxScrollLeftRef = useRef(0);

  const scrollBoundsRef = useRef(null);

  const segmentsRef = useRef([]);

  const saveContainerScroll = () => {
    const {scrollTop, scrollLeft} = scrollContainerRef.current;

    containerScrollRef.current = {
      scrollTop,
      scrollLeft,
    };
  };

  const saveDocumentScroll = () => {
    const {documentScrollLeft, documentScrollTop} = getDocumentScroll();

    documentScrollRef.current = {
      scrollTop: documentScrollTop,
      scrollLeft: documentScrollLeft,
    };
  };

  const removeTempEventListeners = () => {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('touchmove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    document.removeEventListener('touchend', handleMouseUp);
  };

  useEffect(() => {
    if (props.scrollContainer) {
      scrollContainerRef.current = document.querySelector(
        props.scrollContainer
      );
    } else {
      scrollContainerRef.current = selectableRef.current;
    }

    scrollContainerRef.current.addEventListener('scroll', saveContainerScroll);
    document.addEventListener('scroll', saveDocumentScroll);

    selectableRef.current.addEventListener('mousedown', handleMouseDown);
    selectableRef.current.addEventListener('touchstart', handleMouseDown);

    return () => {
      scrollContainerRef.current.removeEventListener(
        'scroll',
        saveContainerScroll
      );
      document.removeEventListener('scroll', saveDocumentScroll);

      selectableRef.current.removeEventListener('mousedown', handleMouseDown);
      selectableRef.current.removeEventListener('touchstart', handleMouseDown);

      removeTempEventListeners();
    };
  }, []);

  const updateRegistry = () => {
    const scrollInfo = {
      scrollTop:
        containerScrollRef.current.scrollTop +
        documentScrollRef.current.scrollTop,
      scrollLeft:
        containerScrollRef.current.scrollLeft +
        documentScrollRef.current.scrollLeft,
    };
    for (const segment of segmentsRef.current) {
      segment.current.hBounds = getBoundsForNode(segment.current, scrollInfo);
    }
  };

  const updateRootBounds = () => {
    scrollBoundsRef.current =
      scrollContainerRef.current.getBoundingClientRect();
    maxScrollTopRef.current =
      scrollContainerRef.current.scrollHeight -
      scrollContainerRef.current.clientHeight;
    maxScrollLeftRef.current =
      scrollContainerRef.current.scrollWidth -
      scrollContainerRef.current.clientWidth;
  };

  const updateContainerScroll = (evt) => {
    const {scrollTop, scrollLeft} = containerScrollRef.current;

    checkScrollTop(evt.clientY, scrollTop);
    checkScrollBottom(evt.clientY, scrollTop);
    checkScrollLeft(evt.clientX, scrollLeft);
    checkScrollRight(evt.clientX, scrollLeft);
  };

  const getScrollStep = (offset) => {
    const {minimumSpeedFactor, scrollSpeed} = props;

    return Math.max(offset, minimumSpeedFactor ?? 0) * scrollSpeed ?? 1;
  };

  const checkScrollTop = (clientY, currentTop) => {
    const offset = scrollBoundsRef.current?.top ?? 0 - clientY;

    if (offset > 0 || clientY < 0) {
      scrollContainerRef.current.scrollTop = currentTop - getScrollStep(offset);
    }
  };

  const checkScrollBottom = (clientY, currentTop) => {
    const offset = clientY - scrollBoundsRef.current?.bottom ?? 0;

    if (offset > 0 || clientY > window.innerHeight) {
      const newTop = currentTop + getScrollStep(offset);
      scrollContainerRef.current.scrollTop = Math.min(
        newTop,
        maxScrollTopRef.current
      );
    }
  };

  const checkScrollLeft = (clientX, currentLeft) => {
    const offset = scrollBoundsRef.current?.left ?? 0 - clientX;

    if (offset > 0 || clientX < 0) {
      const newLeft = currentLeft - getScrollStep(offset);
      scrollContainerRef.current.scrollLeft = newLeft;
    }
  };

  const checkScrollRight = (clientX, currentLeft) => {
    const offset = clientX - scrollBoundsRef.current?.right ?? 0;

    if (offset > 0 || clientX > window.innerWidth) {
      const newLeft = currentLeft + getScrollStep(offset);
      scrollContainerRef.current.scrollLeft = Math.min(
        newLeft,
        maxScrollLeftRef.current
      );
    }
  };

  const api = {
    subscribe: (ref) => {
      segmentsRef.current = [...segmentsRef.current, ref];
    },
    unSubscribe: (ref) => {
      segmentsRef.current = segmentsRef.current.filter(
        (item) => item.current !== ref.current
      );
    },
  };

  useEffect(() => {
    if (selectBoxRef.current) {
    }
  }, []);

  const handleMouseDown = (e) => {
    mouseRef.current.start.x = e.clientX;
    mouseRef.current.start.y = e.clientY;
    mouseRef.current.isDragging = true;

    const evt = castTouchToMouseEvent(e);

    if (
      !props.globalMouse &&
      !isNodeInRoot(evt.target, selectableRef.current)
    ) {
      const [bounds] = getBoundsForNode(
        selectableRef.current,
        documentScrollRef.current
      );
      const collides = doObjectsCollide(
        {
          top: bounds.top,
          left: bounds.left,
          width: 0,
          height: 0,
          offsetHeight: bounds.offsetHeight,
          offsetWidth: bounds.offsetWidth,
        },
        {
          top: evt.pageY,
          left: evt.pageX,
          width: 0,
          height: 0,
          offsetWidth: 0,
          offsetHeight: 0,
        }
      );

      if (!collides) {
        return;
      }
    }

    updateRootBounds();
    updateRegistry();

    mouseDownDataRef.current = {
      target: evt.target,
      selectboxY:
        evt.clientY - scrollBoundsRef.current?.top ??
        0 + containerScrollRef.current.scrollTop,
      selectboxX:
        evt.clientX - scrollBoundsRef.current?.left ??
        0 + containerScrollRef.current.scrollLeft,
    };

    evt.preventDefault();

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('touchmove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchend', handleMouseUp);
  };
  const handleMouseMove = (e) => {
    mouseRef.current.current.x = e.clientX;
    mouseRef.current.current.y = e.clientY;

    const evt = castTouchToMouseEvent(e);
    updateContainerScroll(evt);

    if (mouseRef.current.isDragging) {
      const {clientX, clientY} = evt;

      const pointY =
        clientY - scrollBoundsRef.current?.top ??
        0 + containerScrollRef.current.scrollTop;
      const selectboxY = Math.min(pointY, mouseDownDataRef.current.selectboxY);

      const pointX =
        clientX - scrollBoundsRef.current?.left ??
        0 + containerScrollRef.current.scrollLeft;
      const selectboxX = Math.min(pointX, mouseDownDataRef.current.selectboxX);

      selectboxStateRef.current = {
        x: selectboxX,
        y: selectboxY,
        width: Math.abs(pointX - mouseDownDataRef.current.selectboxX),
        height: Math.abs(pointY - mouseDownDataRef.current.selectboxY),
      };

      selectboxBoundsRef.current = {
        top:
          selectboxStateRef.current.y + scrollBoundsRef.current?.top ??0 + documentScrollRef.current?.scrollTop??0,
        left:
          selectboxStateRef.current.x + scrollBoundsRef.current?.left ??0 + documentScrollRef.current?.scrollLeft??0,
        width: selectboxStateRef.current.width,
        height: selectboxStateRef.current.height,
        offsetWidth: selectboxStateRef.current.width || 1,
        offsetHeight: selectboxStateRef.current.height || 1,
      };

      console.log('selectboxStateRef', selectboxStateRef.current);
      console.log('selectboxBoundsRef', selectboxBoundsRef.current);
      selectBoxRef.current.style.left = selectboxStateRef.current.x + 'px';
      selectBoxRef.current.style.top = selectboxStateRef.current.y + 'px';
      selectBoxRef.current.style.width = selectboxStateRef.current.width + 'px';
      selectBoxRef.current.style.height =
        selectboxStateRef.current.height + 'px';
    }
  };
  const handleMouseUp = (e) => {
    mouseRef.current.isDragging = false;

    removeTempEventListeners();

    const evt = castTouchToMouseEvent(e);
    const {pageX, pageY} = evt;

    if (false && isNodeInRoot(evt.target, selectableRef.current)) {
      //handleClick(evt, pageY, pageX);
    } else {
      if (evt.which === 1 && mouseDownDataRef.current.target === evt.target) {
        preventEvent(evt.target, 'click');
      }

      selectboxStateRef.current = {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
      };

      selectBoxRef.current.style.left = selectboxStateRef.current.x + 'px';
      selectBoxRef.current.style.top = selectboxStateRef.current.y + 'px';
      selectBoxRef.current.style.width = selectboxStateRef.current.width + 'px';
      selectBoxRef.current.style.height =
        selectboxStateRef.current.height + 'px';

      const selectedItems = getSelectedItems(selectboxBoundsRef.current);

      selectboxBoundsRef.current = {
        top: 0,
        left: 0,
        width: 0,
        height: 0,
        offsetWidth: 0,
        offsetHeight: 0,
      };

      onSelectionFinish(selectedItems);
    }
  };

  const preventEvent = (target, type) => {
    const preventHandler = (evt) => {
      target.removeEventListener(type, preventHandler, true);
      evt.preventDefault();
      evt.stopPropagation();
    };
    target.addEventListener(type, preventHandler, true);
  };

  const getSelectedItems = (selectboxBounds) => {
    const {tolerance, enableDeselect, mixedDeselect} = props;
    return segmentsRef.current.filter((item) => {
      return checkItemSelection({
        item: item.current,
        selectboxBounds,
        tolerance: tolerance ?? 0,
        mixedDeselect: mixedDeselect ?? false,
        enableDeselect: enableDeselect ?? false,
      });
    });
  };

  const checkItemSelection = (options) => {
    const {item, tolerance, selectboxBounds, enableDeselect, mixedDeselect} =
      options;

    const {delta} = props;
    const isCollided = doObjectsCollide(
      selectboxBounds,
      item.hBounds,
      tolerance,
      delta
    );
    return isCollided;
  };

  return (
    <div ref={selectableRef} className="selectable-container">
      <context.Provider value={api}>{children}</context.Provider>
      <SelectBox ref={selectBoxRef} />
    </div>
  );
};

export default SelectableContainer;
