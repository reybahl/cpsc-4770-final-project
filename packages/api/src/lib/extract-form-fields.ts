import type { RawFormField } from "./form-agent-types";

/** Playwright/Stagehand page-like interface for evaluation. */
interface PageLike {
  evaluate<T>(pageFunction: () => T): Promise<T>;
}

/**
 * Extracts all visible form field values from the current page using DOM inspection.
 * Returns label, name, type, value, and a stable selector for each field.
 */
export async function extractFormFields(
  page: PageLike,
): Promise<RawFormField[]> {
  const raw = await page.evaluate(() => {
    const fields: {
      id: string;
      label: string;
      name: string;
      type: string;
      value: string;
      selector?: string;
    }[] = [];
    const seen = new Set<string>();
    let idx = 0;

    const getLabel = (el: Element): string => {
      const id = el.id;
      if (id) {
        const labelEl = document.querySelector(`label[for="${id}"]`);
        if (labelEl?.textContent) {
          return labelEl.textContent.trim();
        }
      }
      const parent = el.closest("label");
      if (parent?.textContent) return parent.textContent.trim();
      const prev = el.previousElementSibling;
      if (prev?.textContent) return prev.textContent.trim();
      const ariaLabel = el.getAttribute("aria-label");
      if (ariaLabel) return ariaLabel;
      const placeholder = el.getAttribute("placeholder");
      if (placeholder) return placeholder;
      return (el as HTMLInputElement).name || "Field";
    };

    const getValue = (el: Element): string => {
      if (el instanceof HTMLInputElement) {
        if (el.type === "checkbox" || el.type === "radio") {
          return el.checked ? el.value || "true" : "";
        }
        return el.value;
      }
      if (el instanceof HTMLSelectElement) {
        const opt = el.options[el.selectedIndex];
        return opt ? opt.value || opt.text : "";
      }
      if (el instanceof HTMLTextAreaElement) {
        return el.value;
      }
      return "";
    };

    const getType = (el: Element): string => {
      if (el instanceof HTMLInputElement) return el.type || "text";
      if (el instanceof HTMLSelectElement) return "select";
      if (el instanceof HTMLTextAreaElement) return "textarea";
      return "text";
    };

    const els = document.querySelectorAll<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >(
      "input:not([type='hidden']):not([type='submit']):not([type='button']), select, textarea",
    );
    const elements = Array.from(els);

    for (const el of elements) {
      if (
        el.offsetParent === null &&
        window.getComputedStyle(el).visibility === "hidden"
      )
        continue;
      const value = getValue(el);
      const label = getLabel(el);
      const name = (el as HTMLInputElement).name || `field_${idx}`;
      const type = getType(el);
      const key = `${name}:${label}:${value}`;
      if (seen.has(key)) continue;
      seen.add(key);
      fields.push({
        id: `f_${idx}`,
        label,
        name,
        type,
        value,
        selector: el.id ? `#${el.id}` : undefined,
      });
      idx++;
    }
    return fields;
  });

  return raw as RawFormField[];
}
