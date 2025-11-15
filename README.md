Absolutely\! Here's a comprehensive README for your TinyMark GitHub project.

# ✨ TinyMark v1.0.0: Lightweight Declarative Web Content Engine

TinyMark is a **lightweight markup language engine** designed to simplify building interactive web content using a concise, declarative syntax. It utilizes a custom `<tiny-mark>` element and the Shadow DOM to render dynamic elements, manage styles, and handle user interactions without relying on heavy frameworks.

## 🚀 Key Features

  * **Declarative Syntax:** Build UIs with simple, dot-prefixed commands like `.T1` for headers or `.btn` for buttons.
  * **Custom Element:** Uses the `<tiny-mark>` Web Component, ensuring component isolation via **Shadow DOM**.
  * **Built-in Elements:** Support for text, media (`.img`, `.video`), form inputs, and layout helpers (`.row`, `.card`).
  * **Interactivity System:** Easily create dynamic pages with the `function:` attribute for events like `onclick`, which can `call:` other registered actions.
  * **Hide/Unhide Blocks:** Manage complex or conditional content using `.hide` / `.endhide` blocks and ID-based toggling.
  * **Animations:** Apply simple, effective animations like `hover`, `fade`, and `pop` using attributes.
  * **Inspector Tool:** **Shift+Click** on any TinyMark rendered element to instantly view its raw source line and computed attributes.
  * **Public API:** Interact with the engine programmatically via `window.tinymarkClient`.
  * **Security Model:** JavaScript execution is **opt-in** using the `allow-js` attribute.

-----

## 💻 Installation and Usage

### 1\. Include the Script

Download the `tinymark.js` file and include it in your HTML document.

```html
<script src="tinymark.js"></script>
```

### 2\. Write Your TinyMark Content

Place your TinyMark code inside the `<tiny-mark>` custom element.

```html
<!DOCTYPE html>
<html>
<head>
    <title>TinyMark Demo</title>
    <script src="tinymark.js"></script>
</head>
<body>

    <tiny-mark allow-js>
        // Headings and basic text
        .T1 "Hello TinyMark World" color:blue size:48px
        .t "Welcome to TinyMark!" size:18px family:Arial margin:10px 0

        .divider // Simple horizontal divider

        // Interactive Button
        .btn "Click me to toggle content" function:onclick(call:toggle:content1) style:modern

        // Hidden block of content
        .hide id:content1
            .card "This content is initially hidden and toggled by the button." bg:#f0f0f0 padding:15px radius:4px
        .endhide

        // A placeholder for the hidden content to be rendered into
        .placeholder id:content1

    </tiny-mark>

</body>
</html>
```

-----

## 📖 Syntax Reference

TinyMark lines start with a **dot** (`.`) followed by the **element selector**, then the **text content in quotes**, and finally **attributes** separated by spaces.

### Elements

| Selector | HTML Tag | Description | Example |
| :--- | :--- | :--- | :--- |
| `.T1` - `.T6` | `<h1>` - `<h6>` | Headings | `.T2 "Section Title" color:green` |
| `.t` | `<p>` | Standard Text/Paragraph | `.t "A nice paragraph."` |
| `.btn` / `.button` | `<button>` | Interactive Button | `.btn "Submit" style:cartoonic` |
| `.img` | `<img>` | Image | `.img src:image.jpg width:300px` |
| `.video` | `<video>` | Video | `.video src:clip.mp4 controls` |
| `.input` | `<input>` | Form Input | `.input placeholder:"Your Name" type:text` |
| `.row` | `<div>` (flex) | Horizontal layout container | `.row gap:20px` |
| `.col` | `<div>` (flex) | Vertical layout container | `.col flex:1` |
| `.card` | `<div>` | Boxed content area | `.card shadow:lg bg:#fff` |
| `.divider` | `<hr>` | Horizontal rule | `.divider border:2px solid red` |

### Attributes & Styling

Attributes are provided as `key:value` pairs.

| Attribute | Applies To | Description | Example |
| :--- | :--- | :--- | :--- |
| `color` | All | Font color | `color:red` or `color:#ff0000` |
| `bg` | All | Background color | `bg:#f9f9f9` |
| `size` | Text | Font size | `size:16px` |
| `align` | Text | Text alignment | `align:center` |
| `padding`, `margin` | All | Spacing (CSS shorthand) | `margin:10px 5px` |
| `radius` | All | Border radius | `radius:8px` |
| `shadow` | All | Box shadow | `shadow:0 0 10px #ccc` |
| `animation` | All | Built-in transition/effect | `animation:pop` |
| `href` | Text, Button | Link destination | `href:https://google.com` |

### Interactivity & Functions

Use the `function:onclick(...)` syntax for event handlers.

| Handler | Description | Action Example |
| :--- | :--- | :--- |
| `onclick` | Triggers on element click | `function:onclick(call:show:blockID)` |
| `oncall` | Registers a function block for later execution via `callFunction` | `.id "myFunc" function:oncall(js:console.log('Called'))` |
| `onload` | Triggers when the element loads | `function:onload(call:unhide:initialBlock)` |

The primary action system uses `call:` to **execute block toggling** (hide/unhide) or **trigger registered ID functions**.

| Action | Purpose | Example |
| :--- | :--- | :--- |
| `call:show:ID` | Renders and displays the hidden block with `ID`. | `call:show:my-section` |
| `call:hide:ID` | Hides and removes the content from the placeholder. | `call:hide:my-section` |
| `call:toggle:ID` | Toggles the visibility of the block with `ID`. | `call:toggle:my-section` |
| `call:ID` | Executes a registered `oncall` function with `ID`. | `call:myFunc` |

-----

## ⚙️ Public API (`window.tinymarkClient`)

The TinyMark engine exposes a global object for programmatic control.

| Function | Description | Example |
| :--- | :--- | :--- |
| `renderAll()` | Forces all `<tiny-mark>` elements to re-render. | `tinymarkClient.renderAll()` |
| `unhide(id)` | Renders and displays the hidden block by ID. | `tinymarkClient.unhide('content1')` |
| `hide(id)` | Hides the content block by ID. | `tinymarkClient.hide('content1')` |
| `toggle(id)` | Toggles the content block visibility by ID. | `tinymarkClient.toggle('content1')` |
| `callFunction(id)` | Executes a registered `oncall` function by ID. | `tinymarkClient.callFunction('myFunc')` |
| `toHTML(tinyText)` | Converts TinyMark string to raw HTML string. | `tinymarkClient.toHTML('.t "Hi"')` |

-----

## 🔒 Security

By default, TinyMark is designed for safe content rendering and **does not execute arbitrary JavaScript** from within the markup.

To enable JavaScript execution for `js:` handlers (e.g., in `function:onclick(js:alert(1))`), you must explicitly add the `allow-js` attribute to your `<tiny-mark>` element:

```html
<tiny-mark **allow-js**>
    .btn "JS Allowed" function:onclick(js: console.log('This runs!'))
</tiny-mark>
```

-----

## 🔍 Inspector Tool

For debugging and understanding, you can inspect any rendered TinyMark element:

  * **Shift + Click** on any element rendered inside a `<tiny-mark>` block.

This will display a pop-up with the element's **raw TinyMark source line** and the parsed **attributes**.
