import React from 'react';
import {mergeRefs} from 'react-merge-refs';
import {context} from './context';

const SelectableItem = React.memo(
  React.forwardRef((props, forwardedRef) => {
    const {ItemComponent, isIgnored = false, index, customData} = props;

    const api = React.useContext(context);
    if (!api) throw 'Segment must used inside SelectableContainer component.';
    const ref = React.useRef(null);
    React.useLayoutEffect(() => {
      if (!isIgnored) {
        ref.current.customData = customData;
        api.subscribe(ref);
        return () => {
          api.unSubscribe(ref);
        };
      }
    }, [api]);

    return (
      <ItemComponent
        customData={customData}
        index={index}
        ref={mergeRefs([ref, forwardedRef])}
      />
    );
  })
);

export default SelectableItem;
