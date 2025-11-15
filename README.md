

# ✨ TinyMark v1.8: The Lightweight Declarative Web Content Engine 🚀

TinyMark is a revolutionary **lightweight markup language engine** designed to transform how you build dynamic web content. By leveraging a concise, declarative syntax and the power of Web Components (Shadow DOM), TinyMark allows developers to create interactive UIs with minimal boilerplate and maximum clarity.

## 🔗 Project & Creator Info

| Detail | Value |
| :--- | :--- |
| **Official Page** | 🌐 [tinymark-lang.page.gd](tinymark-lang.page.gd) |
| **Creator** | Aryansh Rai ([instagram.com/real.foil](https://instagram.com/real.foil)) |
| **Socials** | 📸 [@tinymark-lang](https://instagram.com/tinymarklang) |
| **Version** | v1.8 (Initial Release) :|

---

## 🧐 Detailed Explanation of Core Concepts

TinyMark operates on a foundation of four principles for building simple, fast, and maintainable web interfaces:

### 1. 🌈 Declarative Rendering & Conciseness

TinyMark replaces lengthy HTML tags and classes with a single, clear line of text.

* **Structure:** Each element follows the pattern: `.[Selector] "[Text Content]" [Attribute:Value]`
* **Selectors:** Dot-prefixed selectors (e.g., `.t`, `.btn`, `.card`) map directly to standard HTML elements, streamlining development.
* **Styling:** Styling is applied using simple `key:value` attributes (e.g., `color:blue`, `bg:#333`, `size:20px`), which the engine translates into secure inline styles.

### 2. 🛡️ Component Isolation with Shadow DOM

TinyMark ensures stability and compatibility by utilizing the Shadow DOM standard.

* **Isolation:** All elements and styles rendered by `<tiny-mark>` are confined to the component's **shadow tree**. This prevents style leakage and conflicts with the main page's CSS or other libraries.
* **Self-Contained:** Your TinyMark content is guaranteed to look and function exactly as intended, regardless of the host page environment.

### 3. 🖱️ Dynamic Interactivity via Functions

TinyMark introduces a powerful, low-code system for handling events and content toggling.

#### A. Block Management (`.hide` & `.placeholder`)

Complex content blocks can be defined once and toggled on demand:
* **Definition:** Use `.hide id:[ID]... .endhide` to register a content block without rendering it immediately.
* **Placement:** Use `.placeholder id:[ID]` to define the target location for the content.
* **Action:** A button uses `function:onclick(call:toggle:[ID])` to seamlessly render the hidden block into the placeholder and manage its visibility.

#### B. Event Handlers (`function:`)

The `function:` attribute supports simple, chainable commands for interactions:

| Handler | Trigger | Primary Use |
| :--- | :--- | :--- |
| `onclick` | User clicks the element. | `function:onclick(call:show:intro)` |
| `oncall` | Registered as a reusable function block. | `.id "updateTime" function:oncall(...)` |
| `onload` | Element finishes rendering. | `function:onload(call:hide:loader)` |

### 4. 🔒 Security First (`allow-js`)

TinyMark is built with security in mind, providing a safe environment for content rendering.

* **Default Block:** By default, all attempts to run raw JavaScript code via `js:` handlers are **blocked**.
* **Opt-In Privilege:** Developers must explicitly add the `allow-js` attribute to the `<tiny-mark>` tag to enable JavaScript execution within that component, maintaining control over security boundaries.

---

## 🚀 Quick Start Guide

### 1. Include the Script

Ensure `tinymark.js` is accessible and linked in your HTML:

```html
<script src="tinymark-lang.github.io/tinymark.js"></script>
```

### 2\. Write Your TinyMark

Place your declarative markup inside the `<tiny-mark>` custom element:

```html
<!DOCTYPE html>
<html>
<head>
    <title>TinyMark App</title>
    <script src="tinymark-lang.github.io/tinymark.js"></script>
</head>
<body>

    <tiny-mark allow-js>
        // 💬 Heading and introductory text
        .T1 "The TinyMark Difference" color:#764ba2 size:36px
        .t "Build dynamic web content quickly and declaratively." size:16px

        .divider // 📏 Separator

        // 🟢 Button with built-in styling and toggle action
        .btn "Toggle Details" function:onclick(call:toggle:details) style:modern animation:hover

        // 🤫 Hidden block defined for later use
        .hide id:details
            .card "This content appeared with a smooth slide-down effect!" bg:#e6f3ff padding:15px radius:6px animation:slide-down
        .endhide

        // 🎯 Placeholder where the content will be inserted
        .placeholder id:details

    </tiny-mark>

</body>
</html>
```

-----

## 📘 Comprehensive Syntax Reference

### Element Selectors

| Selector | Renders As | Description | Styling Examples |
| :--- | :--- | :--- | :--- |
| `.T1` - `.T6` | `<h1>` - `<h6>` | Headings | `color:navy family:Impact` |
| `.t` | `<p>` | Standard paragraph text | `size:14pt align:left` |
| `.btn` / `.button` | `<button>` | Actionable button | `style:cartoonic bg:orange` |
| `.img` | `<img>` | Media element | `src:logo.png width:100% height:auto` |
| `.row` | `<div>` (`display:flex`) | Horizontal layout | `gap:10px` |
| `.card` | `<div>` | Boxed container | `shadow:medium radius:8px` |
| `.input` | `<input>` | Form input field | `type:text placeholder:"Enter text"` |
| `.divider` | `<hr>` | Horizontal rule | `border:1px solid gray` |

### Styling & Animation Attributes

| Attribute | Category | Description | Examples |
| :--- | :--- | :--- | :--- |
| `color`, `bg` | **Color** | Foreground and background colors. | `color:white bg:black` |
| `size`, `family` | **Typography** | Font size and family. | `size:1.2em family:Roboto` |
| `padding`, `margin` | **Spacing** | CSS shorthand for inner/outer spacing. | `padding:10px` `margin:20px 0` |
| `radius`, `shadow` | **Visuals** | Border radius and box shadow. | `radius:50% shadow:z-depth-3` |
| `animation` | **Motion** | Apply pre-defined effects. | `animation:pop` `animation:slide-left` |

-----

## 🛠️ Public API (`window.tinymarkClient`)

For programmatic control over your TinyMark components from external JavaScript, use the global client object.

| Function | Description | Example |
| :--- | :--- | :--- |
| `tinymarkClient.renderAll()` | Forces all mounted `<tiny-mark>` instances to re-parse and re-render their content. | `tinymarkClient.renderAll()` |
| `tinymarkClient.unhide(id)` | Renders and displays a hidden block into its placeholder. | `tinymarkClient.unhide('userForm')` |
| `tinymarkClient.hide(id)` | Clears and collapses the placeholder element. | `tinymarkClient.hide('results')` |
| `tinymarkClient.toggle(id)` | Flips the visibility state of a block. | `tinymarkClient.toggle('menu')` |
| `tinymarkClient.callFunction(id)` | Executes a registered `oncall` function. | `tinymarkClient.callFunction('apiCall')` |

-----

## 🔍 The TinyMark Inspector (Shift + Click)

TinyMark includes a developer-friendly inspection tool built right into the engine.

> 💡 **Tip:** While browsing your rendered TinyMark page, hold **Shift** and **click** on any element.

A modal will appear, displaying:

1.  **Raw Source:** The exact TinyMark line of code that generated the element.
2.  **Parsed Attributes:** A JSON representation of all resolved attributes.
3.  **Computed Styles:** Key computed CSS properties for quick debugging.

This tool simplifies debugging and helps new users quickly understand the syntax.

```
```
