import React, {useState, useEffect, useRef} from 'react';
import {storiesOf} from '@storybook/react';

//import {SelectableContainer, SelectableItem} from '../../dist/index';
import {SelectableContainer, SelectableItem} from '../components/index';

import './selection.css';

const stories = storiesOf('App Test', module);

const Item = React.forwardRef((props, forwardedRef) => {
  const {index, customData} = props;
  return (
    <div className="item" key={index + 1} ref={forwardedRef}>
      {customData.ele}
    </div>
  );
});

stories.add('App', () => {
  const handleSelectionFinish = (selectedItems) => {
    console.log(
      'selected Items ',
      Array.from(selectedItems.values()).map((v) => v.customData.ele)
    );
  };

  return (
    <>
      <div
        style={{
          height: '10%',
        }}
      />
      <div className="container">
        <SelectableContainer onSelectionFinish={handleSelectionFinish} enableDeselect resetOnStart>
          {Array.from(Array(3000).keys()).map((ele, index) => (
            <SelectableItem
              key={index}
              index={index}
              customData={{ele}}
              ItemComponent={Item}
            />
          ))}
        </SelectableContainer>
      </div>
    </>
  );
});
