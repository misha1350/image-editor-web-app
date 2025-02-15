// Basic color space conversion functions
// References:
// - http://www.brucelindbloom.com/index.html?Math.html
// - https://github.com/colorjs/color-space

// Will convert RGB (0-255) to XYZ
export function rgbToXyz(r, g, b) {
    // Normalize RGB values to 0-1
    let rf = r / 255;
    let gf = g / 255;
    let bf = b / 255;

    // sRGB
    rf = rf > 0.04045 ? Math.pow((rf + 0.055) / 1.055, 2.4) : rf / 12.92;
    gf = gf > 0.04045 ? Math.pow((gf + 0.055) / 1.055, 2.4) : gf / 12.92;
    bf = bf > 0.04045 ? Math.pow((bf + 0.055) / 1.055, 2.4) : bf / 12.92;

    // XYZ
    const x = rf * 0.4124564 + gf * 0.3575761 + bf * 0.1804375;
    const y = rf * 0.2126729 + gf * 0.7151522 + bf * 0.0721750;
    const z = rf * 0.0193339 + gf * 0.1191920 + bf * 0.9503041;

    return { x: x * 100, y: y * 100, z: z * 100 };
}

// Will convert XYZ to Lab
export function xyzToLab(x, y, z) {
    // D65 illuminant
    const xn = 95.047;
    const yn = 100.000;
    const zn = 108.883;

    x = x / xn;
    y = y / yn;
    z = z / zn;

    x = x > 0.008856 ? Math.pow(x, 1/3) : (7.787 * x) + 16/116;
    y = y > 0.008856 ? Math.pow(y, 1/3) : (7.787 * y) + 16/116;
    z = z > 0.008856 ? Math.pow(z, 1/3) : (7.787 * z) + 16/116;

    return {
        l: (116 * y) - 16,
        a: 500 * (x - y),
        b: 200 * (y - z)
    };
}

// Will convert Lab to LCH
export function labToLch(l, a, b) {
    const c = Math.sqrt(a * a + b * b);
    let h = Math.atan2(b, a) * 180 / Math.PI;
    
    if (h < 0) {
        h += 360;
    }

    return { l, c, h };
}

// Will convert RGB to all color spaces
export function getRgbColorSpaces(r, g, b) {
    const xyz = rgbToXyz(r, g, b);
    const lab = xyzToLab(xyz.x, xyz.y, xyz.z);
    const lch = labToLch(lab.l, lab.a, lab.b);

    return {
        rgb: { r, g, b },
        xyz: xyz,
        lab: lab,
        lch: lch,
        oklch: { // Approximate conversion for demo
            l: lab.l / 100,
            c: lch.c / 100,
            h: lch.h
        }
    };
}