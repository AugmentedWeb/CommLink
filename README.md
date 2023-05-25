# CommLink

CommLink is an open source library for userscripts that enables cross-window communication via the userscript storage. It provides a simple and efficient way to send and receive messages between different instances of a userscript running in separate browser windows.

## Installation

To use CommLink in your userscript, you need to add the following line to the userscript header
```js
// @require     https://raw.githubusercontent.com/Hakorr/CommLink/main/CommLink.js
```

## Usage

Too lazy to write documentation right now.

## Compatibility

CommLink relies on userscript grants such as GM_getValue, GM_setValue, GM_deleteValue, and GM_listValues to access the userscript storage. Please ensure that your userscript has the necessary grants for CommLink to function correctly.

If any of the required grants are missing, CommLink will display an alert message
