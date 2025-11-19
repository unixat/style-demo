/*
William 19 Nov 2025
 Selects one or more image thumbnails,
 previewing 90° rotations via CSS transform, and sending async POST
 requests to the backend rotate endpoint `/image/rotate` for now.
 This functionality is intended for: 
 https://reg.dev.freecomett.org.uk/allocation/new_list_images
    and view-images.html in style demo repo to test frontend UI

 Usage notes and caveats:
 - Thumbnails should ideally have a `data-image-filename` attribute 
 containing the filename the server expects, or fallback to the basename 
 of the `src` attribute. I've added a class `allocation-thumbnail` for now.
   
 - Provide three buttons in the page with IDs:
     - `rotate-clockwise`  (rotate 90deg preview)
     - `rotate-anticlockwise` (rotate -90deg preview)
     - `rotate-save-btn`  (send rotation mappings to server)
 - The server endpoint is expected to be POST /image/rotate and accept
   form params `filename` and `degrees` for now.
 - This module performs one POST per image (server currently supports jpegs only).

Behaviour:
 - Click thumbnail to toggle selection (class `selected-for-rotation`).
 - Rotate buttons update a preview only (CSS rotate).
 - Save sends requests sequentially and logs results to console.

 Still to do:
 - Bulk select and rotate on Frontend
 - It's not possible to rotate one image, unselect it and select another to rotate 
 that one and have the UI remember the rotation positions in state.
*/
(function () {
  'use strict';
  // Configuration constants should not change during runtime
  const THUMB_CLASS = 'allocation-thumbnail';
  const SELECTED_CLASS = 'selected-for-rotation';
  const ENDPOINT = '/image/rotate';

  // State: create an obj with key value pairs (remembering their order) 
  // mapped image filename (or index) -> angle in degrees (0,90,180,270)
  const previewAngles = new Map();

  // Helper: find thumbnails
  function getThumbnails() {
    const nodeList = document.querySelectorAll(`img.${THUMB_CLASS}`);
    const thumbnails = [];
    for (let i = 0; i < nodeList.length; i++) {
        thumbnails.push(nodeList[i]);
    }
    return thumbnails;
  }

  // Return the filename portion of a URL or filesystem path 
  // and strip any query string. This is used as a fallback 
  // key when a thumbnail lacks data-image-filename.
  // If your server requires a full path or special ID, prefer setting
  // data-image-filename on the <img> elements in the view.
  function basename(path) {
    return path.split('/').pop().split('?')[0];
  }

  // Toggle selection when clicking thumbnail
  function toggleSelection(img) {
    const key = img.dataset.imageFilename || basename(img.src) || img.dataset.imageIndex;
    if (!key) return;
    if (img.classList.contains(SELECTED_CLASS)) {
      // deselect: remove class and clear preview
      img.classList.remove(SELECTED_CLASS);
      previewAngles.delete(key);
      img.style.transform = '';
      // remove outline styling
      img.style.outline = '';
      console.log(`ImageRotate: deselected ${key}`);
    } else {
      // select: add class and show simple outline
      img.classList.add(SELECTED_CLASS);
      previewAngles.set(key, 0);
      img.style.boxSizing = 'border-box';
      img.style.outline = '6px solid #007fad';
      console.log(`ImageRotate: selected ${key}`);
    }
  }

  // Adjust preview rotation for all selected thumbnails
  function adjustSelection(delta) {
    const selected = getThumbnails().filter(img => img.classList.contains(SELECTED_CLASS));
    if (selected.length === 0) return;
    selected.forEach(img => {
      const key = img.dataset.imageFilename || basename(img.src) || img.dataset.imageIndex;
      const prev = previewAngles.get(key) || 0;
      const next = ((prev + delta) % 360 + 360) % 360;
      previewAngles.set(key, next);
      // apply CSS preview
      img.style.transition = 'transform 0.5s ease';
      img.style.transform = `rotate(${next}deg)`;
      console.log(`ImageRotate: preview ${key} -> ${next}°`);
    });
  }

  // Selection is shown by adding an outline style to the <img> itself.

  // Send rotation request for a single image. Returns parsed JSON or throws.
  async function sendRotateRequest(filename, degrees) {
    // Server expects POST params: filename, degrees
    const fd = new FormData();
    fd.append('filename', filename);
    fd.append('degrees', String(degrees));

    const res = await fetch(ENDPOINT, {
      method: 'POST',
      credentials: 'same-origin',
      body: fd,
      headers: {
        // do not set Content-Type for FormData
      }
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status} ${txt}`);
    }
    return res.json().catch(() => ({}));
  }

  // Save rotations: iterate over selected images and POST to server sequentially
  async function saveRotations() {
    const selected = getThumbnails().filter(img => img.classList.contains(SELECTED_CLASS));
    if (selected.length === 0) {
      console.log('ImageRotate: no images selected');
      return;
    }

    // We'll do sequential to avoid overloading server; group-by-angle could be implemented
    for (const img of selected) {
      const filename = img.dataset.imageFilename || basename(img.src) || img.dataset.imageIndex;
      const key = img.dataset.imageFilename || basename(img.src) || img.dataset.imageIndex;
      const degrees = previewAngles.get(key) || 0;

      try {
        console.log(`ImageRotate: sending rotate for ${filename} ${degrees}°`);
        const json = await sendRotateRequest(filename, degrees);
        // Server may return success or updated URL
        if (json && (json.success || json.results || json.ok)) {
          // If server returned new URL, use it. Otherwise cache-bust current src.
          const newUrl = json.image_url || (img.src.split('?')[0] + '?v=' + Date.now());
          img.src = newUrl;
          console.log(`ImageRotate: rotate success for ${filename}`);
        } else if (json && json.error) {
          console.error('ImageRotate: rotate error', filename, json);
        } else {
          // assume success if HTTP 200 but no body
          img.src = img.src.split('?')[0] + '?v=' + Date.now();
          console.log(`ImageRotate: rotate assumed success for ${filename}`);
        }
      } catch (err) {
        console.error('ImageRotate: rotate request failed', err, filename);
      } finally {
        // cleanup selection and preview
        img.classList.remove(SELECTED_CLASS);
        previewAngles.delete(key);
        img.style.transform = '';
        // remove outline selection styling
        img.style.outline = '';
    
      }
    }
    console.log('ImageRotate: rotation requests completed');
  }

  // Init bindings
  function init() {
    const thumbs = getThumbnails();
    thumbs.forEach(img => {
      img.style.cursor = 'pointer';
      img.addEventListener('click', (e) => {
        toggleSelection(img);
      });
    });

    const leftBtn = document.getElementById('rotate-clockwise');
    const rightBtn = document.getElementById('rotate-anticlockwise');
    const cancelBtn = document.getElementById('cancel-btn');
    const saveBtn = document.getElementById('save-btn');
    
    
    leftBtn.addEventListener('click', () => adjustSelection(90));
    rightBtn.addEventListener('click', () => adjustSelection(-90));
    saveBtn.addEventListener('click', saveRotations);
  }

  // Auto-init when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
