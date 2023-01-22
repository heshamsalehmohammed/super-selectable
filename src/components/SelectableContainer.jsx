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
  detectMouseButton,
  doObjectsCollide,
  getBoundsForNode,
  getDocumentScroll,
  isNodeInRoot,
} from './utils';

const SelectableContainer = (props) => {
  const {
    children,
    onSelectionFinish,
    scrollSpeed = 0.25,
    minimumSpeedFactor = 60,
    delta = 1,
    tolerance = 0,
    globalMouse = false,
    allowAltClick = false,
    allowCtrlClick = false,
    allowMetaClick = false,
    allowShiftClick = false,
    selectOnClick = true,
    resetOnStart = false,
    deselectOnEsc = true,
    allowClickWithoutSelected = true,
  } = props;

  const selectableRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const selectBoxRef = useRef(null);
  const clickedItemRef = useRef(null);

  const selectedItemsRef = useRef(new Set());
  const selectingItemsRef = useRef(new Set());

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

  const mouseDownStartedRef = useRef(false);

  const mouseMoveStartedRef = useRef(false);

  const mouseMovedRef = useRef(false);

  const mouseUpStartedRef = useRef(false);

  const selectionStartedRef = useRef(false);

  const deselectionStartedRef = useRef(false);

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

    if (deselectOnEsc) {
      document.addEventListener('keydown', keyListener);
      document.addEventListener('keyup', keyListener);
    }

    return () => {
      scrollContainerRef.current.removeEventListener(
        'scroll',
        saveContainerScroll
      );
      document.removeEventListener('scroll', saveDocumentScroll);

      selectableRef.current.removeEventListener('mousedown', handleMouseDown);
      selectableRef.current.removeEventListener('touchstart', handleMouseDown);

      if (deselectOnEsc) {
        document.removeEventListener('keydown', keyListener);
        document.removeEventListener('keyup', keyListener);
      }

      removeTempEventListeners();
      selectedItemsRef.current.clear();
      selectingItemsRef.current.clear();
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

  const clearSelection = () => {
    for (const item of selectedItemsRef.current.values()) {
      item.isSelected = false;
      selectedItemsRef.current.delete(item);
    }
  };

  const handleMouseDown = (e) => {
    const isNotLeftButtonClick =
      !e.type.includes('touch') &&
      !detectMouseButton(e, 1, {
        allowAltClick: allowAltClick,
        allowCtrlClick: allowCtrlClick,
        allowMetaClick: allowMetaClick,
        allowShiftClick: allowShiftClick,
      });
    if (mouseDownStartedRef.current || isNotLeftButtonClick) {
      return;
    }

    if (resetOnStart) {
      clearSelection();
    }
    mouseDownStartedRef.current = true;
    mouseUpStartedRef.current = false;
    const evt = castTouchToMouseEvent(e);

    if (!globalMouse && !isNodeInRoot(evt.target, selectableRef.current)) {
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
    const evt = castTouchToMouseEvent(e);
    updateContainerScroll(evt);

    if (mouseMoveStartedRef.current) {
      return;
    }
    mouseMoveStartedRef.current = true;
    mouseMovedRef.current = true;

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
        selectboxStateRef.current.y + scrollBoundsRef.current?.top ??
        0 + documentScrollRef.current.scrollTop,
      left:
        selectboxStateRef.current.x + scrollBoundsRef.current?.left ??
        0 + documentScrollRef.current.scrollLeft,
      width: selectboxStateRef.current.width,
      height: selectboxStateRef.current.height,
      offsetWidth: selectboxStateRef.current.width || 1,
      offsetHeight: selectboxStateRef.current.height || 1,
    };
    selectBoxRef.current.style.left = selectboxStateRef.current.x + 'px';
    selectBoxRef.current.style.top = selectboxStateRef.current.y + 'px';
    selectBoxRef.current.style.width = selectboxStateRef.current.width + 'px';
    selectBoxRef.current.style.height = selectboxStateRef.current.height + 'px';

    mouseMoveStartedRef.current = false;
  };
  const handleMouseUp = (e) => {
    if (mouseUpStartedRef.current) {
      return;
    }

    mouseUpStartedRef.current = true;
    mouseDownStartedRef.current = false;

    removeTempEventListeners();

    if (!mouseDownDataRef.current) {
      return;
    }

    const evt = castTouchToMouseEvent(e);
    const {pageX, pageY} = evt;

    if (
      !mouseMovedRef.current &&
      isNodeInRoot(evt.target, selectableRef.current)
    ) {
      handleClick(evt, pageY, pageX);
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

      selectItems(selectboxBoundsRef.current);

      for (const item of selectingItemsRef.current.values()) {
        item.isSelected = true;
        item.isSelecting = false;
      }
      selectedItemsRef.current = new Set([
        ...selectedItemsRef.current,
        ...selectingItemsRef.current,
      ]);
      selectingItemsRef.current.clear();

      selectboxBoundsRef.current = {
        top: 0,
        left: 0,
        width: 0,
        height: 0,
        offsetWidth: 0,
        offsetHeight: 0,
      };

      onSelectionFinish(selectedItemsRef.current);
    }

    deselectionStartedRef.current = false;
    selectionStartedRef.current = false;
    mouseMovedRef.current = false;
  };

  const keyListener = (evt) => {
    if (evt.keyCode === 27) {
      // escape
      clearSelection();
    }
  };

  const handleClick = (evt, top, left) => {
    if (!selectOnClick) {
      return;
    }

    const {clickClassNameS, allowClickWithoutSelected, onSelectionFinish} =
      props;
    const classNames = evt.target.classList || [];
    const classNamesArr = Array.from(classNames);
    const isMouseUpOnClickElement = clickClassNameS.some((c) =>
      classNamesArr.includes(c)
    );

    if (
      allowClickWithoutSelected ||
      selectedItemsRef.current.size ||
      isMouseUpOnClickElement ||
      evt.ctrlKey
    ) {
      selectItems(
        {
          top,
          left,
          width: 0,
          height: 0,
          offsetWidth: 0,
          offsetHeight: 0,
        },
        {isFromClick: true}
      );

      onSelectionFinish([...selectedItemsRef.current], clickedItemRef.current);

      if (evt.which === 1) {
        preventEvent(evt.target, 'click');
      }
      if (evt.which === 2 || evt.which === 3) {
        preventEvent(evt.target, 'contextmenu');
      }
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

  const selectItems = (selectboxBounds, options) => {
    const {enableDeselect, mixedDeselect} = props;
    segmentsRef.current.forEach((item) => {
      processItem({
        item: item.current,
        selectboxBounds,
        tolerance: tolerance,
        mixedDeselect: mixedDeselect ?? false,
        enableDeselect: enableDeselect ?? false,
        isFromClick: options && options.isFromClick,
      });
    });
  };

  const processItem = (options) => {
    const {
      item,
      tolerance,
      selectboxBounds,
      enableDeselect,
      mixedDeselect,
      isFromClick,
    } = options;

    const isCollided = doObjectsCollide(
      selectboxBounds,
      item.hBounds,
      tolerance,
      delta
    );

    const {isSelecting, isSelected} = item;

    if (isFromClick && isCollided) {
      if (isSelected) {
        selectedItemsRef.current.delete(item);
      } else {
        selectedItemsRef.current.add(item);
      }

      item.isSelected = !isSelected;
      clickedItemRef.current = item;

      return item;
    }

    if (!isFromClick && isCollided) {
      if (
        isSelected &&
        enableDeselect &&
        (!selectionStartedRef.current || mixedDeselect)
      ) {
        item.isSelected = false;
        item.deselected = true;

        deselectionStartedRef.current = true;

        return selectedItemsRef.current.delete(item);
      }

      const canSelect = mixedDeselect
        ? !item.deselected
        : !deselectionStartedRef.current;

      if (!isSelecting && !isSelected && canSelect) {
        item.isSelecting = true;

        selectionStartedRef.current = true;
        selectingItemsRef.current.add(item);

        return {updateSelecting: true};
      }
    }

    if (!isFromClick && !isCollided && isSelecting) {
      if (selectingItemsRef.current.has(item)) {
        item.setState({isSelecting: false});

        selectingItemsRef.current.delete(item);

        return {updateSelecting: true};
      }
    }

    return null;
  };

  const defaultContainerStyle = {
    position: 'relative',
  };

  return (
    <div
      ref={selectableRef}
      className="selectable-container"
      style={{...defaultContainerStyle, ...props.style}}>
      <context.Provider value={api}>{children}</context.Provider>
      <SelectBox ref={selectBoxRef} />
    </div>
  );
};

export default SelectableContainer;
