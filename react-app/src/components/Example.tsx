import React from 'react';
import logo from '../static/logo.svg';
import './Example.css';

function Example() {
  return (
    <div className="Example">
      <header className="Example-header">
        <img src={logo} className="Example-logo" alt="logo" />
        <p>
          Edit <code>src/components/Example.tsx</code> and save to reload...
        </p>
        <a
          className="Example-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
    </div>
  );
}

export default Example;
