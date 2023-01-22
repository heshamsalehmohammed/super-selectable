import React, {useState, useEffect, useRef} from 'react';
import {storiesOf} from '@storybook/react';

//import {SelectableContainer, SelectableItem} from '../../dist/index';
import {SelectableContainer, SelectableItem} from '../components/index';

import './selection.css';

const stories = storiesOf('App Test', module);

const Item = React.forwardRef((props, forwardedRef) => {
  const {index} = props;
  return <div className="item" key={index + 1} ref={forwardedRef}></div>;
});

stories.add('App', () => {
  const handleSelectionFinish = (selectedItems) => {
    if (selectedItems.length > 0) {
      
    }
  };

  return (
    <div className="container">
      <SelectableContainer onSelectionFinish={handleSelectionFinish}>
        {new Array(150).fill(0).map((ele, index) => (
          <SelectableItem
            key={index}
            index={index}
            customData={{Hesham: true}}
            ItemComponent={Item}
          />
        ))}
      </SelectableContainer>
    </div>
  );
});
