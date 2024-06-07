const fs = require("fs");
const path = require("path");
const opentype = require("opentype.js");
const SVGPathCommander = require("svg-path-commander");
const {
    WEIGHT,
    SF_SYMBOLS_VERSION,
    PATH_PRECISION,
    FONT_SIZE,
} = require("./constants");

function createSvgFileContents(pathData, width, height) {
    return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" version="1.1">
  <path d="${pathData}" fill="currentColor"/>
</svg>`;
}

function writeSvgFile(dir, fileName, svgContents) {
    const svgFilePath = path.join(dir, fileName);
    fs.mkdirSync(path.dirname(svgFilePath), { recursive: true });
    fs.writeFileSync(svgFilePath, svgContents);
}

// Paths
const PATHS = {
    CHARS: `${__dirname}/../sources/${SF_SYMBOLS_VERSION}/chars.txt`,
    NAMES: `${__dirname}/../sources/${SF_SYMBOLS_VERSION}/names.txt`,
    EXPORT_NAMES: `${__dirname}/../sources/${SF_SYMBOLS_VERSION}/names.export.txt`,
    OUT_DIR: `${__dirname}/../output/svg/`, // Directory for SVG files
};

async function make() {
    const font = await opentype.load(
        `${__dirname}/../sources/${SF_SYMBOLS_VERSION}/SF-Pro-Text-${WEIGHT}.otf`
    );

    console.log("Capturing Paths... This takes a while");

    const chars = fs
        .readFileSync(PATHS.CHARS, { encoding: "utf-8" })
        .match(/.{1,2}/g);

    const namesToExport = new Set(fs.readFileSync(PATHS.EXPORT_NAMES, { encoding: "utf8", flag: "r" })
        .split(/\r?\n/));

    const names = fs.readFileSync(PATHS.NAMES, { encoding: "utf8", flag: "r" })
        .split(/\r?\n/);

    let exportCounter = 0;
    const processedNames = new Set();

    names.forEach((name, namesIndex) => {
        if (namesToExport.has(name)) {
            exportCounter++;
            processedNames.add(name);
            console.log(`${exportCounter}/${namesToExport.size} - ${name}`);

            const path = font.getPath(
                chars[namesIndex],
                0,
                0,
                FONT_SIZE
            );
            const bb = path.getBoundingBox();
            const pathData = path.toPathData(PATH_PRECISION);

            const transform = {
                translate: [bb.x1 * -1, bb.y1 * -1],
                origin: [0, 0],
            };

            const transformed2DPathString = new SVGPathCommander(pathData)
                .transform(transform)
                .toString();

            const svgContents = createSvgFileContents(
                transformed2DPathString,
                bb.x2 - bb.x1,
                bb.y2 - bb.y1
            );

            const svgFileName = `${name}.svg`;

            writeSvgFile(PATHS.OUT_DIR, svgFileName, svgContents);
        }
    });

    const missingNames = [...namesToExport].filter(name => !processedNames.has(name));
    if (missingNames.length > 0) {
        console.log("====== MISSING SYMBOLS =======");
        missingNames.forEach(name => console.log(name));
        console.log("==============================");
    }

    console.log("SVG Generation Complete!");
}

make();
