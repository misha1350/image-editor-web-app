## Task 1: Basics of a Web Application for Image Manipulation

**Goal:** Create a basic web application for loading, displaying, and analyzing images.

**Steps:**

1.  **Framework Selection (optional):** React, Vue, Angular, or plain JavaScript.
2.  **Component Library Selection (optional):** Material-UI, Vuetify, Angular Material, etc.
3.  **Project Initialization:** Set up the project with the chosen framework and library.
4.  **Image Upload Component:**
    *   Implement a component for uploading images.
    *   Use UI elements from the selected library.
    *   Support loading via file or URL.
5.  **Displaying the Image on a Canvas:**
    *   Use the `<canvas>` element.
    *   Display the loaded image on the canvas.
6.  **Extracting Color Information:**
    *   Implement functionality to track clicks/hovers on the canvas.
    *   Extract RGB values of the pixel.
    *   Display RGB, pixel coordinates, image width, and height in an information panel.
7.  **README:** Create a README file with a description of the project.

**Result:** A static web page with basic image manipulation functionality.

## Task 2: Expanding Functionality - Image Resizing

**Goal:** Add the ability to resize images to the existing web application.

**Steps:**

1.  **Using the Existing Project:** Use the project from Task 1 as a base.
2.  **Modal Window (dialog):** Create a modal window component for entering resizing parameters.
3.  **Zooming the View:**
    *   Canvas occupies the maximum screen area.
    *   Dropdown list or range for zoom selection (12% - 300%).
    *   Automatic image scaling on load with 50px margins.
    *   Redraw the image when the zoom changes.
4.  **Resizing the Image:**
    *   Information about the number of pixels before and after resizing (in megapixels).
    *   Choice of resizing units: percentages or pixels.
    *   Fields for entering height and width.
    *   Checkbox to maintain proportions.
    *   Selection of interpolation algorithm (nearest neighbor only).
    *   Tooltip with a description of the interpolation algorithm.
    *   User input validation.
    *   Create a new image with the specified dimensions based on ImageData.
5.  **Saving the Image:**
    *   "Save" button.
    *   Save the scaled image to the user's device.

**Result:** A web page with the ability to resize and scale images.

## Task 3: Color Spaces and Tools

**Goal:** Add support for different color spaces and tools for image analysis.

**Steps:**

1.  **Color Spaces:**
    *   Study RGB, XYZ, Lab, LCH, OKLch.
    *   Display color information in different spaces.
2.  **Toolbar:**
    *   Buttons for "hand" and "eyedropper" tools.
    *   Visual highlighting of the active tool.
    *   Optional: hotkeys to activate tools.
    *   Tooltips with descriptions of the tools.
3.  **"Eyedropper" Tool:**
    *   Information panel for two colors.
    *   Select the first color with a normal click, the second with Alt/Ctrl/Shift.
    *   Display color swatches.
    *   Display X, Y coordinates and color coordinates in RGB, XYZ, Lab (optionally LCH, OKLch).
    *   Tooltips for color spaces with information about axes and ranges.
    *   Correct calculation of X, Y coordinates taking into account scale and shift.
    *   Contrast calculation (WCAG 2.0 G18).
    *   Display information about insufficient contrast (if < 4.5:1).
    *   Optional: contrast calculation according to APCA (WCAG 3.0).
4.  **"Hand" Tool:**
    *   Move the image with the left mouse button pressed or with arrow keys.
    *   Limit movement so that part of the image is always visible.
    *   Optional: scrollbars for the canvas.
    *   Optional: modifiers for arrow keys to change the speed of movement.
    *   Optional: move with the mouse wheel with a modifier.

**Result:** A web page with advanced tools for analyzing and working with color.

**Tips:**

*   Documentation: Add links to the official documentation of the components and algorithms used.
*   Separation into pages: There should be a separate page for each task (1, 2, 3).