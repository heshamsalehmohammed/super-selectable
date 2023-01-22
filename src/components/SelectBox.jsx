import React from 'react';
import './SelectBox.css';

const SelectBox = React.forwardRef((props, forwardedRef) => {
  return <div className="selectable-select-box" ref={forwardedRef}></div>;
});

export default SelectBox;
