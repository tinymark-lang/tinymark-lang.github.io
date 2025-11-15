I've updated the README to include the author and social details, and provided a more detailed explanation of the core concepts of **TinyMark**.

# ✨ TinyMark v1.0.0: Lightweight Declarative Web Content Engine

**Access TinyMark Live:** [tinymark-lang.page.gd](https://www.google.com/search?q=tinymark-lang.page.gd)

**Created by:** Aryansh Rai ([instagram.com/real.foil](https://www.google.com/search?q=https://instagram.com/real.foil))

**Follow Us:** [@tinymark-lang](https://www.google.com/search?q=https://instagram.com/tinymarklang)

TinyMark is a **lightweight markup language engine** designed to simplify building interactive web content using a concise, declarative syntax. It utilizes a custom `<tiny-mark>` element and the Shadow DOM to render dynamic elements, manage styles, and handle user interactions without relying on heavy frameworks.

-----

## 💡 Detailed Explanation of Core Concepts

TinyMark operates on four key principles: **Declarative Rendering**, **Component Isolation**, **Functional Interactivity**, and **Security by Default**.

### 1\. Declarative Rendering and Selectors

TinyMark replaces traditional HTML tags with a concise, line-based syntax that starts with a dot followed by a **selector** (e.g., `.t`, `.T1`, `.btn`).

  * **Syntax Structure:** Each line represents an element:
    `.[Selector] "[Text Content]" [Attribute:Value]`
  * **Attributes:** Styling and behavior are applied using simple `key:value` pairs appended to the line (e.g., `color:blue`, `size:18px`). The engine parses these to apply inline CSS styles or handle specific element properties (`src`, `href`).
  * **Example:**
    ```tinymark
    .T1 "Project Name" color:red size:40px family:Helvetica
    .btn "Start" function:onclick(call:toggle:section1) style:modern
    ```

### 2\. Component Isolation with Shadow DOM

TinyMark leverages **Web Components**, specifically the `<tiny-mark>` element, and attaches a **Shadow DOM** to it.

  * **Encapsulation:** By rendering content within the Shadow DOM, TinyMark ensures that the styles it applies and the elements it creates are completely **isolated** from the main page's CSS. This prevents styling conflicts and makes TinyMark highly portable.
  * **Self-Contained Rendering:** The engine parses the raw text content inside the `<tiny-mark>` tag, translates it into the appropriate HTML structure, applies styles, and injects it into the isolated shadow tree.

### 3\. Dynamic Interactivity and Hidden Blocks

Interactivity is managed through a powerful function system based on the `function:` attribute, coupled with the concept of hidden, reusable content blocks.

#### A. Block Toggling (`.hide` and `.placeholder`)

Instead of dynamically generating content, TinyMark lets you pre-define blocks of content that are not rendered initially.

  * **`.hide` / `.endhide`:** Defines a block of TinyMark code with an `id`. This code is **parsed and stored** by the engine but is not rendered to the page.
  * **`.placeholder`:** Defines a specific area (`<section>`) in the rendered output where a hidden block will be inserted when called.
  * **`call:` Action:** A button's `onclick` function uses `call:toggle:ID` to fetch the stored TinyMark from the hidden block, render it into the placeholder, and make it visible.

#### B. Functions (`oncall`)

The `.id` selector can be used to register a block of actions that can be triggered from anywhere.

  * **Registration:** `.id "myFunction" function:oncall( /* actions */ )`
  * **Execution:** `function:onclick(call:myFunction)`

### 4\. Security Model (`allow-js`)

TinyMark prioritizes security, especially when handling external or user-provided content.

  * **Opt-In JavaScript:** By default, any attempt to execute raw JavaScript code using `js:` handlers (e.g., `js:alert('X')`) is **blocked** and logged as a warning.
  * **Enabling JS:** The developer must explicitly add the `allow-js` boolean attribute to the parent `<tiny-mark>` tag to permit JavaScript execution within that specific component.

-----

## 🚀 Key Features

  * **Declarative Syntax:** Build UIs with simple, dot-prefixed commands like `.T1` for headers or `.btn` for buttons.
  * **Custom Element:** Uses the `<tiny-mark>` Web Component, ensuring component isolation via **Shadow DOM**.
  * **Built-in Elements:** Support for text, media (`.img`, `.video`), form inputs, and layout helpers (`.row`, `.card`).
  * **Animations:** Apply simple, effective animations like `hover`, `fade`, and `pop` using the `animation:` attribute.
  * **Inspector Tool:** **Shift+Click** on any TinyMark rendered element to instantly view its raw source line and computed attributes.
  * **Public API:** Interact with the engine programmatically via `window.tinymarkClient`.

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

        // Hidden block of content (will not render until called)
        .hide id:content1
            .card "This content is initially hidden and toggled by the button." bg:#f0f0f0 padding:15px radius:4px animation:slide-down
        .endhide

        // A placeholder where the content will appear
        .placeholder id:content1

    </tiny-mark>

</body>
</html>
```

-----

## 📖 Syntax Reference

| Selector | HTML Tag | Description | Example |
| :--- | :--- | :--- | :--- |
| `.T1` - `.T6` | `<h1>` - `<h6>` | Headings | `.T2 "Section Title" color:green` |
| `.t` | `<p>` | Standard Text/Paragraph | `.t "A nice paragraph."` |
| `.btn` / `.button` | `<button>` | Interactive Button | `.btn "Submit" style:cartoonic` |
| `.img` | `<img>` | Image | `.img src:image.jpg width:300px` |
| `.row`, `.col` | `<div>` (flex) | Layout containers | `.row gap:20px` |
| `.card` | `<div>` | Boxed content area | `.card shadow:lg bg:#fff` |
| `.hide` | N/A | Defines content for toggling | `.hide id:block1` |
| `.placeholder` | `<section>` | Target for hidden content | `.placeholder id:block1` |

### Interactivity Actions (used within `function:`)

| Action | Purpose | Example |
| :--- | :--- | :--- |
| `call:show:ID` | Renders and displays the hidden block with `ID`. | `call:show:my-section` |
| `call:toggle:ID` | Toggles the visibility of the block with `ID`. | `call:toggle:my-section` |
| `call:ID` | Executes a registered `oncall` function. | `call:myFunction` |
| `js:<code>` | Executes raw JavaScript (requires `allow-js`). | `js:console.log('Done!')` |

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

Would you like a sample TinyMark file (`.tmk`) created to showcase these features?
