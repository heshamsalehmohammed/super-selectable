import React, {useState, useEffect, useRef} from 'react';
import {storiesOf} from '@storybook/react';

//import {SelectableContainer} from '../../dist/index';
import {SelectableContainer} from '../components/index';

const stories = storiesOf('App Test', module);

stories.add('App', () => {
  return (
    <>
      <SelectableContainer />
    </>
  );
});
