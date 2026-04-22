import type { RawFormField } from "./form-agent-types";

/** Playwright/Stagehand page-like interface for evaluation. */
interface PageLike {
  evaluate<T>(pageFunction: string | (() => T)): Promise<T>;
}

/**
 * In-browser extraction logic as a single expression string.
 * Stagehand v3 wraps function callbacks in a template literal and JSON round-trips
 * the return value; that breaks for some larger functions (CDP reports "Uncaught").
 * Passing a string uses Runtime.evaluate directly (see Stagehand Page.evaluate).
 */
const EXTRACT_FORM_FIELDS_EXPR = `
(function () {
  var fields = [];
  var seen = new Set();
  var idx = 0;

  function labelForId(id) {
    if (!id) return null;
    var labels = document.getElementsByTagName("label");
    for (var i = 0; i < labels.length; i++) {
      if (labels[i].htmlFor === id) return labels[i];
    }
    return null;
  }

  function getLabel(el) {
    var id = el.id;
    if (id) {
      var labelEl = labelForId(id);
      if (labelEl && labelEl.textContent) return labelEl.textContent.trim();
    }
    var parent = el.closest("label");
    if (parent && parent.textContent) return parent.textContent.trim();
    var prev = el.previousElementSibling;
    if (prev && prev.textContent) return prev.textContent.trim();
    var ariaLabel = el.getAttribute("aria-label");
    if (ariaLabel) return ariaLabel;
    var placeholder = el.getAttribute("placeholder");
    if (placeholder) return placeholder;
    return el.name || "Field";
  }

  function getValue(el) {
    var tag = el.tagName;
    if (tag === "INPUT") {
      var t = el.type || "text";
      if (t === "checkbox" || t === "radio") return el.checked ? el.value || "true" : "";
      return el.value;
    }
    if (tag === "SELECT") {
      var opt = el.options[el.selectedIndex];
      return opt ? opt.value || opt.text : "";
    }
    if (tag === "TEXTAREA") return el.value;
    return "";
  }

  function getType(el) {
    var tag = el.tagName;
    if (tag === "INPUT") return el.type || "text";
    if (tag === "SELECT") return "select";
    if (tag === "TEXTAREA") return "textarea";
    return "text";
  }

  function isVisible(el) {
    var node = el;
    while (node && node !== document.documentElement) {
      var s = window.getComputedStyle(node);
      if (s.display === "none" || s.visibility === "hidden") return false;
      node = node.parentElement;
    }
    return true;
  }

  var els = document.querySelectorAll(
    "input:not([type='hidden']):not([type='submit']):not([type='button']), select, textarea"
  );
  for (var j = 0; j < els.length; j++) {
    var el = els[j];
    if (!isVisible(el)) continue;
    var value = getValue(el);
    var label = getLabel(el);
    var name = el.name || "field_" + idx;
    var type = getType(el);
    var key = name + ":" + label + ":" + value;
    if (seen.has(key)) continue;
    seen.add(key);
    var row = {
      id: "f_" + idx,
      label: label,
      name: name,
      type: type,
      value: value,
    };
    if (el.id) row.selector = "#" + el.id;
    fields.push(row);
    idx++;
  }
  return fields;
})()
`;

/**
 * Extracts all visible form field values from the current page using DOM inspection.
 * Returns label, name, type, value, and a stable selector for each field.
 */
export async function extractFormFields(
  page: PageLike,
): Promise<RawFormField[]> {
  const raw = await page.evaluate(EXTRACT_FORM_FIELDS_EXPR);
  return raw as RawFormField[];
}
