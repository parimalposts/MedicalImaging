"use client";
/**
 * Cornerstone.js v3 initialization.
 * Must be imported only in 'use client' components and loaded with
 * dynamic({ ssr: false }) — Cornerstone uses window/WebGL/WebWorker.
 *
 * Init order matters: coreInit → dicomImageLoaderInit → external dicomParser.
 */

let initialized = false;

export async function initCornerstone() {
  if (initialized) return;
  initialized = true;

  const { init: coreInit } = await import("@cornerstonejs/core");
  const cornerstoneDICOMImageLoader = await import(
    "@cornerstonejs/dicom-image-loader"
  );
  const dicomParser = await import("dicom-parser");

  await coreInit();

  cornerstoneDICOMImageLoader.init({ maxWebWorkers: 1 });

  // Required: wire dicom-parser so the DICOM image loader can parse files
  (cornerstoneDICOMImageLoader as any).external = {
    ...(cornerstoneDICOMImageLoader as any).external,
    dicomParser: dicomParser.default ?? dicomParser,
  };
}

export async function getCornerstoneTools() {
  const tools = await import("@cornerstonejs/tools");
  return tools;
}

export async function getCornerstoneCore() {
  const core = await import("@cornerstonejs/core");
  return core;
}
