// vite.config.js
import path3 from "node:path";
import react from "file:///C:/Users/Computia.me/Desktop/Shared%20Docs/Readynest%20WebApp/node_modules/@vitejs/plugin-react/dist/index.mjs";
import { createLogger, defineConfig } from "file:///C:/Users/Computia.me/Desktop/Shared%20Docs/Readynest%20WebApp/node_modules/vite/dist/node/index.js";

// plugins/visual-editor/vite-plugin-react-inline-editor.js
import path2 from "path";
import { parse as parse2 } from "file:///C:/Users/Computia.me/Desktop/Shared%20Docs/Readynest%20WebApp/node_modules/@babel/parser/lib/index.js";
import traverseBabel2 from "file:///C:/Users/Computia.me/Desktop/Shared%20Docs/Readynest%20WebApp/node_modules/@babel/traverse/lib/index.js";
import * as t from "file:///C:/Users/Computia.me/Desktop/Shared%20Docs/Readynest%20WebApp/node_modules/@babel/types/lib/index.js";
import fs2 from "fs";

// plugins/utils/ast-utils.js
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import generate from "file:///C:/Users/Computia.me/Desktop/Shared%20Docs/Readynest%20WebApp/node_modules/@babel/generator/lib/index.js";
import { parse } from "file:///C:/Users/Computia.me/Desktop/Shared%20Docs/Readynest%20WebApp/node_modules/@babel/parser/lib/index.js";
import traverseBabel from "file:///C:/Users/Computia.me/Desktop/Shared%20Docs/Readynest%20WebApp/node_modules/@babel/traverse/lib/index.js";
import {
  isJSXIdentifier,
  isJSXMemberExpression
} from "file:///C:/Users/Computia.me/Desktop/Shared%20Docs/Readynest%20WebApp/node_modules/@babel/types/lib/index.js";
var __vite_injected_original_import_meta_url = "file:///C:/Users/Computia.me/Desktop/Shared%20Docs/Readynest%20WebApp/plugins/utils/ast-utils.js";
var __filename = fileURLToPath(__vite_injected_original_import_meta_url);
var __dirname2 = path.dirname(__filename);
var VITE_PROJECT_ROOT = path.resolve(__dirname2, "../..");
function validateFilePath(filePath) {
  if (!filePath) {
    return { isValid: false, error: "Missing filePath" };
  }
  const absoluteFilePath = path.resolve(VITE_PROJECT_ROOT, filePath);
  if (filePath.includes("..") || !absoluteFilePath.startsWith(VITE_PROJECT_ROOT) || absoluteFilePath.includes("node_modules")) {
    return { isValid: false, error: "Invalid path" };
  }
  if (!fs.existsSync(absoluteFilePath)) {
    return { isValid: false, error: "File not found" };
  }
  return { isValid: true, absolutePath: absoluteFilePath };
}
function parseFileToAST(absoluteFilePath) {
  const content = fs.readFileSync(absoluteFilePath, "utf-8");
  return parse(content, {
    sourceType: "module",
    plugins: ["jsx", "typescript"],
    errorRecovery: true
  });
}
function findJSXElementAtPosition(ast, line, column) {
  let targetNodePath = null;
  let closestNodePath = null;
  let closestDistance = Infinity;
  const allNodesOnLine = [];
  const visitor = {
    JSXOpeningElement(path4) {
      const node = path4.node;
      if (node.loc) {
        if (node.loc.start.line === line && Math.abs(node.loc.start.column - column) <= 1) {
          targetNodePath = path4;
          path4.stop();
          return;
        }
        if (node.loc.start.line === line) {
          allNodesOnLine.push({
            path: path4,
            column: node.loc.start.column,
            distance: Math.abs(node.loc.start.column - column)
          });
        }
        if (node.loc.start.line === line) {
          const distance = Math.abs(node.loc.start.column - column);
          if (distance < closestDistance) {
            closestDistance = distance;
            closestNodePath = path4;
          }
        }
      }
    },
    // Also check JSXElement nodes that contain the position
    JSXElement(path4) {
      var _a;
      const node = path4.node;
      if (!node.loc) {
        return;
      }
      if (node.loc.start.line > line || node.loc.end.line < line) {
        return;
      }
      if (!((_a = path4.node.openingElement) == null ? void 0 : _a.loc)) {
        return;
      }
      const openingLine = path4.node.openingElement.loc.start.line;
      const openingCol = path4.node.openingElement.loc.start.column;
      if (openingLine === line) {
        const distance = Math.abs(openingCol - column);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestNodePath = path4.get("openingElement");
        }
        return;
      }
      if (openingLine < line) {
        const distance = (line - openingLine) * 100;
        if (distance < closestDistance) {
          closestDistance = distance;
          closestNodePath = path4.get("openingElement");
        }
      }
    }
  };
  traverseBabel.default(ast, visitor);
  const threshold = closestDistance < 100 ? 50 : 500;
  return targetNodePath || (closestDistance <= threshold ? closestNodePath : null);
}
function generateCode(node, options = {}) {
  const generateFunction = generate.default || generate;
  const output = generateFunction(node, options);
  return output.code;
}
function generateSourceWithMap(ast, sourceFileName, originalCode) {
  const generateFunction = generate.default || generate;
  return generateFunction(ast, {
    sourceMaps: true,
    sourceFileName
  }, originalCode);
}

// plugins/visual-editor/vite-plugin-react-inline-editor.js
var EDITABLE_HTML_TAGS = ["a", "Button", "button", "p", "span", "h1", "h2", "h3", "h4", "h5", "h6", "label", "Label", "img"];
function parseEditId(editId) {
  const parts = editId.split(":");
  if (parts.length < 3) {
    return null;
  }
  const column = parseInt(parts.at(-1), 10);
  const line = parseInt(parts.at(-2), 10);
  const filePath = parts.slice(0, -2).join(":");
  if (!filePath || isNaN(line) || isNaN(column)) {
    return null;
  }
  return { filePath, line, column };
}
function checkTagNameEditable(openingElementNode, editableTagsList) {
  if (!openingElementNode || !openingElementNode.name)
    return false;
  const nameNode = openingElementNode.name;
  if (nameNode.type === "JSXIdentifier" && editableTagsList.includes(nameNode.name)) {
    return true;
  }
  if (nameNode.type === "JSXMemberExpression" && nameNode.property && nameNode.property.type === "JSXIdentifier" && editableTagsList.includes(nameNode.property.name)) {
    return true;
  }
  return false;
}
function validateImageSrc(openingNode) {
  var _a;
  if (!openingNode || !openingNode.name || openingNode.name.name !== "img" && ((_a = openingNode.name.property) == null ? void 0 : _a.name) !== "img") {
    return { isValid: true, reason: null };
  }
  const hasPropsSpread = openingNode.attributes.some(
    (attr) => t.isJSXSpreadAttribute(attr) && attr.argument && t.isIdentifier(attr.argument) && attr.argument.name === "props"
  );
  if (hasPropsSpread) {
    return { isValid: false, reason: "props-spread" };
  }
  const srcAttr = openingNode.attributes.find(
    (attr) => t.isJSXAttribute(attr) && attr.name && attr.name.name === "src"
  );
  if (!srcAttr) {
    return { isValid: false, reason: "missing-src" };
  }
  if (!t.isStringLiteral(srcAttr.value)) {
    return { isValid: false, reason: "dynamic-src" };
  }
  if (!srcAttr.value.value || srcAttr.value.value.trim() === "") {
    return { isValid: false, reason: "empty-src" };
  }
  return { isValid: true, reason: null };
}
function inlineEditPlugin() {
  return {
    name: "vite-inline-edit-plugin",
    enforce: "pre",
    transform(code, id) {
      if (!/\.(jsx|tsx)$/.test(id) || !id.startsWith(VITE_PROJECT_ROOT) || id.includes("node_modules")) {
        return null;
      }
      const relativeFilePath = path2.relative(VITE_PROJECT_ROOT, id);
      const webRelativeFilePath = relativeFilePath.split(path2.sep).join("/");
      try {
        const babelAst = parse2(code, {
          sourceType: "module",
          plugins: ["jsx", "typescript"],
          errorRecovery: true
        });
        let attributesAdded = 0;
        traverseBabel2.default(babelAst, {
          enter(path4) {
            if (path4.isJSXOpeningElement()) {
              const openingNode = path4.node;
              const elementNode = path4.parentPath.node;
              if (!openingNode.loc) {
                return;
              }
              const alreadyHasId = openingNode.attributes.some(
                (attr) => t.isJSXAttribute(attr) && attr.name.name === "data-edit-id"
              );
              if (alreadyHasId) {
                return;
              }
              const isCurrentElementEditable = checkTagNameEditable(openingNode, EDITABLE_HTML_TAGS);
              if (!isCurrentElementEditable) {
                return;
              }
              const imageValidation = validateImageSrc(openingNode);
              if (!imageValidation.isValid) {
                const disabledAttribute = t.jsxAttribute(
                  t.jsxIdentifier("data-edit-disabled"),
                  t.stringLiteral("true")
                );
                openingNode.attributes.push(disabledAttribute);
                attributesAdded++;
                return;
              }
              let shouldBeDisabledDueToChildren = false;
              if (t.isJSXElement(elementNode) && elementNode.children) {
                const hasPropsSpread = openingNode.attributes.some(
                  (attr) => t.isJSXSpreadAttribute(attr) && attr.argument && t.isIdentifier(attr.argument) && attr.argument.name === "props"
                );
                const hasDynamicChild = elementNode.children.some(
                  (child) => t.isJSXExpressionContainer(child)
                );
                if (hasDynamicChild || hasPropsSpread) {
                  shouldBeDisabledDueToChildren = true;
                }
              }
              if (!shouldBeDisabledDueToChildren && t.isJSXElement(elementNode) && elementNode.children) {
                const hasEditableJsxChild = elementNode.children.some((child) => {
                  if (t.isJSXElement(child)) {
                    return checkTagNameEditable(child.openingElement, EDITABLE_HTML_TAGS);
                  }
                  return false;
                });
                if (hasEditableJsxChild) {
                  shouldBeDisabledDueToChildren = true;
                }
              }
              if (shouldBeDisabledDueToChildren) {
                const disabledAttribute = t.jsxAttribute(
                  t.jsxIdentifier("data-edit-disabled"),
                  t.stringLiteral("true")
                );
                openingNode.attributes.push(disabledAttribute);
                attributesAdded++;
                return;
              }
              if (t.isJSXElement(elementNode) && elementNode.children && elementNode.children.length > 0) {
                let hasNonEditableJsxChild = false;
                for (const child of elementNode.children) {
                  if (t.isJSXElement(child)) {
                    if (!checkTagNameEditable(child.openingElement, EDITABLE_HTML_TAGS)) {
                      hasNonEditableJsxChild = true;
                      break;
                    }
                  }
                }
                if (hasNonEditableJsxChild) {
                  const disabledAttribute = t.jsxAttribute(
                    t.jsxIdentifier("data-edit-disabled"),
                    t.stringLiteral("true")
                  );
                  openingNode.attributes.push(disabledAttribute);
                  attributesAdded++;
                  return;
                }
              }
              let currentAncestorCandidatePath = path4.parentPath.parentPath;
              while (currentAncestorCandidatePath) {
                const ancestorJsxElementPath = currentAncestorCandidatePath.isJSXElement() ? currentAncestorCandidatePath : currentAncestorCandidatePath.findParent((p) => p.isJSXElement());
                if (!ancestorJsxElementPath) {
                  break;
                }
                if (checkTagNameEditable(ancestorJsxElementPath.node.openingElement, EDITABLE_HTML_TAGS)) {
                  return;
                }
                currentAncestorCandidatePath = ancestorJsxElementPath.parentPath;
              }
              const line = openingNode.loc.start.line;
              const column = openingNode.loc.start.column + 1;
              const editId = `${webRelativeFilePath}:${line}:${column}`;
              const idAttribute = t.jsxAttribute(
                t.jsxIdentifier("data-edit-id"),
                t.stringLiteral(editId)
              );
              openingNode.attributes.push(idAttribute);
              attributesAdded++;
            }
          }
        });
        if (attributesAdded > 0) {
          const output = generateSourceWithMap(babelAst, webRelativeFilePath, code);
          return { code: output.code, map: output.map };
        }
        return null;
      } catch (error) {
        console.error(`[vite][visual-editor] Error transforming ${id}:`, error);
        return null;
      }
    },
    // Updates source code based on the changes received from the client
    configureServer(server) {
      server.middlewares.use("/api/apply-edit", async (req, res, next) => {
        if (req.method !== "POST")
          return next();
        let body = "";
        req.on("data", (chunk) => {
          body += chunk.toString();
        });
        req.on("end", async () => {
          var _a;
          let absoluteFilePath = "";
          try {
            const { editId, newFullText } = JSON.parse(body);
            if (!editId || typeof newFullText === "undefined") {
              res.writeHead(400, { "Content-Type": "application/json" });
              return res.end(JSON.stringify({ error: "Missing editId or newFullText" }));
            }
            const parsedId = parseEditId(editId);
            if (!parsedId) {
              res.writeHead(400, { "Content-Type": "application/json" });
              return res.end(JSON.stringify({ error: "Invalid editId format (filePath:line:column)" }));
            }
            const { filePath, line, column } = parsedId;
            const validation = validateFilePath(filePath);
            if (!validation.isValid) {
              res.writeHead(400, { "Content-Type": "application/json" });
              return res.end(JSON.stringify({ error: validation.error }));
            }
            absoluteFilePath = validation.absolutePath;
            const originalContent = fs2.readFileSync(absoluteFilePath, "utf-8");
            const babelAst = parseFileToAST(absoluteFilePath);
            const targetNodePath = findJSXElementAtPosition(babelAst, line, column + 1);
            if (!targetNodePath) {
              res.writeHead(404, { "Content-Type": "application/json" });
              return res.end(JSON.stringify({ error: "Target node not found by line/column", editId }));
            }
            const targetOpeningElement = targetNodePath.node;
            const parentElementNode = (_a = targetNodePath.parentPath) == null ? void 0 : _a.node;
            const isImageElement = targetOpeningElement.name && targetOpeningElement.name.name === "img";
            let beforeCode = "";
            let afterCode = "";
            let modified = false;
            if (isImageElement) {
              beforeCode = generateCode(targetOpeningElement);
              const srcAttr = targetOpeningElement.attributes.find(
                (attr) => t.isJSXAttribute(attr) && attr.name && attr.name.name === "src"
              );
              if (srcAttr && t.isStringLiteral(srcAttr.value)) {
                srcAttr.value = t.stringLiteral(newFullText);
                modified = true;
                afterCode = generateCode(targetOpeningElement);
              }
            } else {
              if (parentElementNode && t.isJSXElement(parentElementNode)) {
                beforeCode = generateCode(parentElementNode);
                parentElementNode.children = [];
                if (newFullText && newFullText.trim() !== "") {
                  const newTextNode = t.jsxText(newFullText);
                  parentElementNode.children.push(newTextNode);
                }
                modified = true;
                afterCode = generateCode(parentElementNode);
              }
            }
            if (!modified) {
              res.writeHead(409, { "Content-Type": "application/json" });
              return res.end(JSON.stringify({ error: "Could not apply changes to AST." }));
            }
            const webRelativeFilePath = path2.relative(VITE_PROJECT_ROOT, absoluteFilePath).split(path2.sep).join("/");
            const output = generateSourceWithMap(babelAst, webRelativeFilePath, originalContent);
            const newContent = output.code;
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
              success: true,
              newFileContent: newContent,
              beforeCode,
              afterCode
            }));
          } catch (error) {
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Internal server error during edit application." }));
          }
        });
      });
    }
  };
}

// plugins/visual-editor/vite-plugin-edit-mode.js
import { readFileSync } from "fs";
import { resolve } from "path";
import { fileURLToPath as fileURLToPath2 } from "url";

// plugins/visual-editor/visual-editor-config.js
var EDIT_MODE_STYLES = `
	#root[data-edit-mode-enabled="true"] [data-edit-id] {
		cursor: pointer; 
		outline: 2px dashed #357DF9; 
		outline-offset: 2px;
		min-height: 1em;
	}
	#root[data-edit-mode-enabled="true"] img[data-edit-id] {
		outline-offset: -2px;
	}
	#root[data-edit-mode-enabled="true"] {
		cursor: pointer;
	}
	#root[data-edit-mode-enabled="true"] [data-edit-id]:hover {
		background-color: #357DF933;
		outline-color: #357DF9; 
	}

	@keyframes fadeInTooltip {
		from {
			opacity: 0;
			transform: translateY(5px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	#inline-editor-disabled-tooltip {
		display: none; 
		opacity: 0; 
		position: absolute;
		background-color: #1D1E20;
		color: white;
		padding: 4px 8px;
		border-radius: 8px;
		z-index: 10001;
		font-size: 14px;
		border: 1px solid #3B3D4A;
		max-width: 184px;
		text-align: center;
	}

	#inline-editor-disabled-tooltip.tooltip-active {
		display: block;
		animation: fadeInTooltip 0.2s ease-out forwards;
	}
`;

// plugins/visual-editor/vite-plugin-edit-mode.js
var __vite_injected_original_import_meta_url2 = "file:///C:/Users/Computia.me/Desktop/Shared%20Docs/Readynest%20WebApp/plugins/visual-editor/vite-plugin-edit-mode.js";
var __filename2 = fileURLToPath2(__vite_injected_original_import_meta_url2);
var __dirname3 = resolve(__filename2, "..");
function inlineEditDevPlugin() {
  return {
    name: "vite:inline-edit-dev",
    apply: "serve",
    transformIndexHtml() {
      const scriptPath = resolve(__dirname3, "edit-mode-script.js");
      const scriptContent = readFileSync(scriptPath, "utf-8");
      return [
        {
          tag: "script",
          attrs: { type: "module" },
          children: scriptContent,
          injectTo: "body"
        },
        {
          tag: "style",
          children: EDIT_MODE_STYLES,
          injectTo: "head"
        }
      ];
    }
  };
}

// plugins/vite-plugin-iframe-route-restoration.js
function iframeRouteRestorationPlugin() {
  return {
    name: "vite:iframe-route-restoration",
    apply: "serve",
    transformIndexHtml() {
      const script = `
      const ALLOWED_PARENT_ORIGINS = [
          "https://horizons.hostinger.com",
          "https://horizons.hostinger.dev",
          "https://horizons-frontend-local.hostinger.dev",
      ];

        // Check to see if the page is in an iframe
        if (window.self !== window.top) {
          const STORAGE_KEY = 'horizons-iframe-saved-route';

          const getCurrentRoute = () => location.pathname + location.search + location.hash;

          const save = () => {
            try {
              const currentRoute = getCurrentRoute();
              sessionStorage.setItem(STORAGE_KEY, currentRoute);
              window.parent.postMessage({message: 'route-changed', route: currentRoute}, '*');
            } catch {}
          };

          const replaceHistoryState = (url) => {
            try {
              history.replaceState(null, '', url);
              window.dispatchEvent(new PopStateEvent('popstate', { state: history.state }));
              return true;
            } catch {}
            return false;
          };

          const restore = () => {
            try {
              const saved = sessionStorage.getItem(STORAGE_KEY);
              if (!saved) return;

              if (!saved.startsWith('/')) {
                sessionStorage.removeItem(STORAGE_KEY);
                return;
              }

              const current = getCurrentRoute();
              if (current !== saved) {
                if (!replaceHistoryState(saved)) {
                  replaceHistoryState('/');
                }

                requestAnimationFrame(() => setTimeout(() => {
                  try {
                    const text = (document.body?.innerText || '').trim();

                    // If the restored route results in too little content, assume it is invalid and navigate home
                    if (text.length < 50) {
                      replaceHistoryState('/');
                    }
                  } catch {}
                }, 1000));
              }
            } catch {}
          };

          const originalPushState = history.pushState;
          history.pushState = function(...args) {
            originalPushState.apply(this, args);
            save();
          };

          const originalReplaceState = history.replaceState;
          history.replaceState = function(...args) {
            originalReplaceState.apply(this, args);
            save();
          };

          const getParentOrigin = () => {
              if (
                  window.location.ancestorOrigins &&
                  window.location.ancestorOrigins.length > 0
              ) {
                  return window.location.ancestorOrigins[0];
              }

              if (document.referrer) {
                  try {
                      return new URL(document.referrer).origin;
                  } catch (e) {
                      console.warn("Invalid referrer URL:", document.referrer);
                  }
              }

              return null;
          };

          window.addEventListener('popstate', save);
          window.addEventListener('hashchange', save);
          window.addEventListener("message", function (event) {
              const parentOrigin = getParentOrigin();

              if (event.data?.type === "redirect-home" && parentOrigin && ALLOWED_PARENT_ORIGINS.includes(parentOrigin)) {
                const saved = sessionStorage.getItem(STORAGE_KEY);

                if(saved && saved !== '/') {
                  replaceHistoryState('/')
                }
              }
          });

          restore();
        }
      `;
      return [
        {
          tag: "script",
          attrs: { type: "module" },
          children: script,
          injectTo: "head"
        }
      ];
    }
  };
}

// plugins/selection-mode/vite-plugin-selection-mode.js
import { readFileSync as readFileSync2 } from "node:fs";
import { resolve as resolve2 } from "node:path";
import { fileURLToPath as fileURLToPath3 } from "node:url";
var __vite_injected_original_import_meta_url3 = "file:///C:/Users/Computia.me/Desktop/Shared%20Docs/Readynest%20WebApp/plugins/selection-mode/vite-plugin-selection-mode.js";
var __filename3 = fileURLToPath3(__vite_injected_original_import_meta_url3);
var __dirname4 = resolve2(__filename3, "..");
function selectionModePlugin() {
  return {
    name: "vite:selection-mode",
    apply: "serve",
    transformIndexHtml() {
      const scriptPath = resolve2(__dirname4, "selection-mode-script.js");
      const scriptContent = readFileSync2(scriptPath, "utf-8");
      return [
        {
          tag: "script",
          attrs: { type: "module" },
          children: scriptContent,
          injectTo: "body"
        }
      ];
    }
  };
}

// vite.config.js
var __vite_injected_original_dirname = "C:\\Users\\Computia.me\\Desktop\\Shared Docs\\Readynest WebApp";
var isDev = process.env.NODE_ENV !== "production";
var configHorizonsViteErrorHandler = `
const observer = new MutationObserver((mutations) => {
	for (const mutation of mutations) {
		for (const addedNode of mutation.addedNodes) {
			if (
				addedNode.nodeType === Node.ELEMENT_NODE &&
				(
					addedNode.tagName?.toLowerCase() === 'vite-error-overlay' ||
					addedNode.classList?.contains('backdrop')
				)
			) {
				handleViteOverlay(addedNode);
			}
		}
	}
});

observer.observe(document.documentElement, {
	childList: true,
	subtree: true
});

function handleViteOverlay(node) {
	if (!node.shadowRoot) {
		return;
	}

	const backdrop = node.shadowRoot.querySelector('.backdrop');

	if (backdrop) {
		const overlayHtml = backdrop.outerHTML;
		const parser = new DOMParser();
		const doc = parser.parseFromString(overlayHtml, 'text/html');
		const messageBodyElement = doc.querySelector('.message-body');
		const fileElement = doc.querySelector('.file');
		const messageText = messageBodyElement ? messageBodyElement.textContent.trim() : '';
		const fileText = fileElement ? fileElement.textContent.trim() : '';
		const error = messageText + (fileText ? ' File:' + fileText : '');

		window.parent.postMessage({
			type: 'horizons-vite-error',
			error,
		}, '*');
	}
}
`;
var configHorizonsRuntimeErrorHandler = `
window.onerror = (message, source, lineno, colno, errorObj) => {
	const errorDetails = errorObj ? JSON.stringify({
		name: errorObj.name,
		message: errorObj.message,
		stack: errorObj.stack,
		source,
		lineno,
		colno,
	}) : null;

	window.parent.postMessage({
		type: 'horizons-runtime-error',
		message,
		error: errorDetails
	}, '*');
};
`;
var configHorizonsConsoleErrroHandler = `
const originalConsoleError = console.error;
console.error = function(...args) {
	originalConsoleError.apply(console, args);

	let errorString = '';

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg instanceof Error) {
			errorString = arg.stack || \`\${arg.name}: \${arg.message}\`;
			break;
		}
	}

	if (!errorString) {
		errorString = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
	}

	window.parent.postMessage({
		type: 'horizons-console-error',
		error: errorString
	}, '*');
};
`;
var configWindowFetchMonkeyPatch = `
const originalFetch = window.fetch;

window.fetch = function(...args) {
	const url = args[0] instanceof Request ? args[0].url : args[0];

	// Skip WebSocket URLs
	if (url.startsWith('ws:') || url.startsWith('wss:')) {
		return originalFetch.apply(this, args);
	}

	return originalFetch.apply(this, args)
		.then(async response => {
			const contentType = response.headers.get('Content-Type') || '';

			// Exclude HTML document responses
			const isDocumentResponse =
				contentType.includes('text/html') ||
				contentType.includes('application/xhtml+xml');

			if (!response.ok && !isDocumentResponse) {
					const responseClone = response.clone();
					const errorFromRes = await responseClone.text();
					const requestUrl = response.url;
					console.error(\`Fetch error from \${requestUrl}: \${errorFromRes}\`);
			}

			return response;
		})
		.catch(error => {
			if (!url.match(/.html?$/i)) {
				console.error(error);
			}

			throw error;
		});
};
`;
var configNavigationHandler = `
if (window.navigation && window.self !== window.top) {
	window.navigation.addEventListener('navigate', (event) => {
		const url = event.destination.url;

		try {
			const destinationUrl = new URL(url);
			const destinationOrigin = destinationUrl.origin;
			const currentOrigin = window.location.origin;

			if (destinationOrigin === currentOrigin) {
				return;
			}
		} catch (error) {
			return;
		}

		window.parent.postMessage({
			type: 'horizons-navigation-error',
			url,
		}, '*');
	});
}
`;
var addTransformIndexHtml = {
  name: "add-transform-index-html",
  transformIndexHtml(html) {
    const tags = [
      {
        tag: "script",
        attrs: { type: "module" },
        children: configHorizonsRuntimeErrorHandler,
        injectTo: "head"
      },
      {
        tag: "script",
        attrs: { type: "module" },
        children: configHorizonsViteErrorHandler,
        injectTo: "head"
      },
      {
        tag: "script",
        attrs: { type: "module" },
        children: configHorizonsConsoleErrroHandler,
        injectTo: "head"
      },
      {
        tag: "script",
        attrs: { type: "module" },
        children: configWindowFetchMonkeyPatch,
        injectTo: "head"
      },
      {
        tag: "script",
        attrs: { type: "module" },
        children: configNavigationHandler,
        injectTo: "head"
      }
    ];
    if (!isDev && process.env.TEMPLATE_BANNER_SCRIPT_URL && process.env.TEMPLATE_REDIRECT_URL) {
      tags.push(
        {
          tag: "script",
          attrs: {
            src: process.env.TEMPLATE_BANNER_SCRIPT_URL,
            "template-redirect-url": process.env.TEMPLATE_REDIRECT_URL
          },
          injectTo: "head"
        }
      );
    }
    return {
      html,
      tags
    };
  }
};
console.warn = () => {
};
var logger = createLogger();
var loggerError = logger.error;
logger.error = (msg, options) => {
  var _a;
  if ((_a = options == null ? void 0 : options.error) == null ? void 0 : _a.toString().includes("CssSyntaxError: [postcss]")) {
    return;
  }
  loggerError(msg, options);
};
var vite_config_default = defineConfig({
  customLogger: logger,
  plugins: [
    ...isDev ? [inlineEditPlugin(), inlineEditDevPlugin(), iframeRouteRestorationPlugin(), selectionModePlugin()] : [],
    react(),
    addTransformIndexHtml
  ],
  server: {
    cors: true,
    headers: {
      "Cross-Origin-Embedder-Policy": "credentialless"
    },
    allowedHosts: true
  },
  resolve: {
    extensions: [".jsx", ".js", ".tsx", ".ts", ".json"],
    alias: {
      "@": path3.resolve(__vite_injected_original_dirname, "./src")
    }
  },
  build: {
    rollupOptions: {
      external: [
        "@babel/parser",
        "@babel/traverse",
        "@babel/generator",
        "@babel/types"
      ]
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiLCAicGx1Z2lucy92aXN1YWwtZWRpdG9yL3ZpdGUtcGx1Z2luLXJlYWN0LWlubGluZS1lZGl0b3IuanMiLCAicGx1Z2lucy91dGlscy9hc3QtdXRpbHMuanMiLCAicGx1Z2lucy92aXN1YWwtZWRpdG9yL3ZpdGUtcGx1Z2luLWVkaXQtbW9kZS5qcyIsICJwbHVnaW5zL3Zpc3VhbC1lZGl0b3IvdmlzdWFsLWVkaXRvci1jb25maWcuanMiLCAicGx1Z2lucy92aXRlLXBsdWdpbi1pZnJhbWUtcm91dGUtcmVzdG9yYXRpb24uanMiLCAicGx1Z2lucy9zZWxlY3Rpb24tbW9kZS92aXRlLXBsdWdpbi1zZWxlY3Rpb24tbW9kZS5qcyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXENvbXB1dGlhLm1lXFxcXERlc2t0b3BcXFxcU2hhcmVkIERvY3NcXFxcUmVhZHluZXN0IFdlYkFwcFwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcQ29tcHV0aWEubWVcXFxcRGVza3RvcFxcXFxTaGFyZWQgRG9jc1xcXFxSZWFkeW5lc3QgV2ViQXBwXFxcXHZpdGUuY29uZmlnLmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy9Db21wdXRpYS5tZS9EZXNrdG9wL1NoYXJlZCUyMERvY3MvUmVhZHluZXN0JTIwV2ViQXBwL3ZpdGUuY29uZmlnLmpzXCI7aW1wb3J0IHBhdGggZnJvbSAnbm9kZTpwYXRoJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XG5pbXBvcnQgeyBjcmVhdGVMb2dnZXIsIGRlZmluZUNvbmZpZyB9IGZyb20gJ3ZpdGUnO1xuaW1wb3J0IGlubGluZUVkaXRQbHVnaW4gZnJvbSAnLi9wbHVnaW5zL3Zpc3VhbC1lZGl0b3Ivdml0ZS1wbHVnaW4tcmVhY3QtaW5saW5lLWVkaXRvci5qcyc7XG5pbXBvcnQgZWRpdE1vZGVEZXZQbHVnaW4gZnJvbSAnLi9wbHVnaW5zL3Zpc3VhbC1lZGl0b3Ivdml0ZS1wbHVnaW4tZWRpdC1tb2RlLmpzJztcbmltcG9ydCBpZnJhbWVSb3V0ZVJlc3RvcmF0aW9uUGx1Z2luIGZyb20gJy4vcGx1Z2lucy92aXRlLXBsdWdpbi1pZnJhbWUtcm91dGUtcmVzdG9yYXRpb24uanMnO1xuaW1wb3J0IHNlbGVjdGlvbk1vZGVQbHVnaW4gZnJvbSAnLi9wbHVnaW5zL3NlbGVjdGlvbi1tb2RlL3ZpdGUtcGx1Z2luLXNlbGVjdGlvbi1tb2RlLmpzJztcblxuY29uc3QgaXNEZXYgPSBwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nO1xuXG5jb25zdCBjb25maWdIb3Jpem9uc1ZpdGVFcnJvckhhbmRsZXIgPSBgXG5jb25zdCBvYnNlcnZlciA9IG5ldyBNdXRhdGlvbk9ic2VydmVyKChtdXRhdGlvbnMpID0+IHtcblx0Zm9yIChjb25zdCBtdXRhdGlvbiBvZiBtdXRhdGlvbnMpIHtcblx0XHRmb3IgKGNvbnN0IGFkZGVkTm9kZSBvZiBtdXRhdGlvbi5hZGRlZE5vZGVzKSB7XG5cdFx0XHRpZiAoXG5cdFx0XHRcdGFkZGVkTm9kZS5ub2RlVHlwZSA9PT0gTm9kZS5FTEVNRU5UX05PREUgJiZcblx0XHRcdFx0KFxuXHRcdFx0XHRcdGFkZGVkTm9kZS50YWdOYW1lPy50b0xvd2VyQ2FzZSgpID09PSAndml0ZS1lcnJvci1vdmVybGF5JyB8fFxuXHRcdFx0XHRcdGFkZGVkTm9kZS5jbGFzc0xpc3Q/LmNvbnRhaW5zKCdiYWNrZHJvcCcpXG5cdFx0XHRcdClcblx0XHRcdCkge1xuXHRcdFx0XHRoYW5kbGVWaXRlT3ZlcmxheShhZGRlZE5vZGUpO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxufSk7XG5cbm9ic2VydmVyLm9ic2VydmUoZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LCB7XG5cdGNoaWxkTGlzdDogdHJ1ZSxcblx0c3VidHJlZTogdHJ1ZVxufSk7XG5cbmZ1bmN0aW9uIGhhbmRsZVZpdGVPdmVybGF5KG5vZGUpIHtcblx0aWYgKCFub2RlLnNoYWRvd1Jvb3QpIHtcblx0XHRyZXR1cm47XG5cdH1cblxuXHRjb25zdCBiYWNrZHJvcCA9IG5vZGUuc2hhZG93Um9vdC5xdWVyeVNlbGVjdG9yKCcuYmFja2Ryb3AnKTtcblxuXHRpZiAoYmFja2Ryb3ApIHtcblx0XHRjb25zdCBvdmVybGF5SHRtbCA9IGJhY2tkcm9wLm91dGVySFRNTDtcblx0XHRjb25zdCBwYXJzZXIgPSBuZXcgRE9NUGFyc2VyKCk7XG5cdFx0Y29uc3QgZG9jID0gcGFyc2VyLnBhcnNlRnJvbVN0cmluZyhvdmVybGF5SHRtbCwgJ3RleHQvaHRtbCcpO1xuXHRcdGNvbnN0IG1lc3NhZ2VCb2R5RWxlbWVudCA9IGRvYy5xdWVyeVNlbGVjdG9yKCcubWVzc2FnZS1ib2R5Jyk7XG5cdFx0Y29uc3QgZmlsZUVsZW1lbnQgPSBkb2MucXVlcnlTZWxlY3RvcignLmZpbGUnKTtcblx0XHRjb25zdCBtZXNzYWdlVGV4dCA9IG1lc3NhZ2VCb2R5RWxlbWVudCA/IG1lc3NhZ2VCb2R5RWxlbWVudC50ZXh0Q29udGVudC50cmltKCkgOiAnJztcblx0XHRjb25zdCBmaWxlVGV4dCA9IGZpbGVFbGVtZW50ID8gZmlsZUVsZW1lbnQudGV4dENvbnRlbnQudHJpbSgpIDogJyc7XG5cdFx0Y29uc3QgZXJyb3IgPSBtZXNzYWdlVGV4dCArIChmaWxlVGV4dCA/ICcgRmlsZTonICsgZmlsZVRleHQgOiAnJyk7XG5cblx0XHR3aW5kb3cucGFyZW50LnBvc3RNZXNzYWdlKHtcblx0XHRcdHR5cGU6ICdob3Jpem9ucy12aXRlLWVycm9yJyxcblx0XHRcdGVycm9yLFxuXHRcdH0sICcqJyk7XG5cdH1cbn1cbmA7XG5cbmNvbnN0IGNvbmZpZ0hvcml6b25zUnVudGltZUVycm9ySGFuZGxlciA9IGBcbndpbmRvdy5vbmVycm9yID0gKG1lc3NhZ2UsIHNvdXJjZSwgbGluZW5vLCBjb2xubywgZXJyb3JPYmopID0+IHtcblx0Y29uc3QgZXJyb3JEZXRhaWxzID0gZXJyb3JPYmogPyBKU09OLnN0cmluZ2lmeSh7XG5cdFx0bmFtZTogZXJyb3JPYmoubmFtZSxcblx0XHRtZXNzYWdlOiBlcnJvck9iai5tZXNzYWdlLFxuXHRcdHN0YWNrOiBlcnJvck9iai5zdGFjayxcblx0XHRzb3VyY2UsXG5cdFx0bGluZW5vLFxuXHRcdGNvbG5vLFxuXHR9KSA6IG51bGw7XG5cblx0d2luZG93LnBhcmVudC5wb3N0TWVzc2FnZSh7XG5cdFx0dHlwZTogJ2hvcml6b25zLXJ1bnRpbWUtZXJyb3InLFxuXHRcdG1lc3NhZ2UsXG5cdFx0ZXJyb3I6IGVycm9yRGV0YWlsc1xuXHR9LCAnKicpO1xufTtcbmA7XG5cbmNvbnN0IGNvbmZpZ0hvcml6b25zQ29uc29sZUVycnJvSGFuZGxlciA9IGBcbmNvbnN0IG9yaWdpbmFsQ29uc29sZUVycm9yID0gY29uc29sZS5lcnJvcjtcbmNvbnNvbGUuZXJyb3IgPSBmdW5jdGlvbiguLi5hcmdzKSB7XG5cdG9yaWdpbmFsQ29uc29sZUVycm9yLmFwcGx5KGNvbnNvbGUsIGFyZ3MpO1xuXG5cdGxldCBlcnJvclN0cmluZyA9ICcnO1xuXG5cdGZvciAobGV0IGkgPSAwOyBpIDwgYXJncy5sZW5ndGg7IGkrKykge1xuXHRcdGNvbnN0IGFyZyA9IGFyZ3NbaV07XG5cdFx0aWYgKGFyZyBpbnN0YW5jZW9mIEVycm9yKSB7XG5cdFx0XHRlcnJvclN0cmluZyA9IGFyZy5zdGFjayB8fCBcXGBcXCR7YXJnLm5hbWV9OiBcXCR7YXJnLm1lc3NhZ2V9XFxgO1xuXHRcdFx0YnJlYWs7XG5cdFx0fVxuXHR9XG5cblx0aWYgKCFlcnJvclN0cmluZykge1xuXHRcdGVycm9yU3RyaW5nID0gYXJncy5tYXAoYXJnID0+IHR5cGVvZiBhcmcgPT09ICdvYmplY3QnID8gSlNPTi5zdHJpbmdpZnkoYXJnKSA6IFN0cmluZyhhcmcpKS5qb2luKCcgJyk7XG5cdH1cblxuXHR3aW5kb3cucGFyZW50LnBvc3RNZXNzYWdlKHtcblx0XHR0eXBlOiAnaG9yaXpvbnMtY29uc29sZS1lcnJvcicsXG5cdFx0ZXJyb3I6IGVycm9yU3RyaW5nXG5cdH0sICcqJyk7XG59O1xuYDtcblxuY29uc3QgY29uZmlnV2luZG93RmV0Y2hNb25rZXlQYXRjaCA9IGBcbmNvbnN0IG9yaWdpbmFsRmV0Y2ggPSB3aW5kb3cuZmV0Y2g7XG5cbndpbmRvdy5mZXRjaCA9IGZ1bmN0aW9uKC4uLmFyZ3MpIHtcblx0Y29uc3QgdXJsID0gYXJnc1swXSBpbnN0YW5jZW9mIFJlcXVlc3QgPyBhcmdzWzBdLnVybCA6IGFyZ3NbMF07XG5cblx0Ly8gU2tpcCBXZWJTb2NrZXQgVVJMc1xuXHRpZiAodXJsLnN0YXJ0c1dpdGgoJ3dzOicpIHx8IHVybC5zdGFydHNXaXRoKCd3c3M6JykpIHtcblx0XHRyZXR1cm4gb3JpZ2luYWxGZXRjaC5hcHBseSh0aGlzLCBhcmdzKTtcblx0fVxuXG5cdHJldHVybiBvcmlnaW5hbEZldGNoLmFwcGx5KHRoaXMsIGFyZ3MpXG5cdFx0LnRoZW4oYXN5bmMgcmVzcG9uc2UgPT4ge1xuXHRcdFx0Y29uc3QgY29udGVudFR5cGUgPSByZXNwb25zZS5oZWFkZXJzLmdldCgnQ29udGVudC1UeXBlJykgfHwgJyc7XG5cblx0XHRcdC8vIEV4Y2x1ZGUgSFRNTCBkb2N1bWVudCByZXNwb25zZXNcblx0XHRcdGNvbnN0IGlzRG9jdW1lbnRSZXNwb25zZSA9XG5cdFx0XHRcdGNvbnRlbnRUeXBlLmluY2x1ZGVzKCd0ZXh0L2h0bWwnKSB8fFxuXHRcdFx0XHRjb250ZW50VHlwZS5pbmNsdWRlcygnYXBwbGljYXRpb24veGh0bWwreG1sJyk7XG5cblx0XHRcdGlmICghcmVzcG9uc2Uub2sgJiYgIWlzRG9jdW1lbnRSZXNwb25zZSkge1xuXHRcdFx0XHRcdGNvbnN0IHJlc3BvbnNlQ2xvbmUgPSByZXNwb25zZS5jbG9uZSgpO1xuXHRcdFx0XHRcdGNvbnN0IGVycm9yRnJvbVJlcyA9IGF3YWl0IHJlc3BvbnNlQ2xvbmUudGV4dCgpO1xuXHRcdFx0XHRcdGNvbnN0IHJlcXVlc3RVcmwgPSByZXNwb25zZS51cmw7XG5cdFx0XHRcdFx0Y29uc29sZS5lcnJvcihcXGBGZXRjaCBlcnJvciBmcm9tIFxcJHtyZXF1ZXN0VXJsfTogXFwke2Vycm9yRnJvbVJlc31cXGApO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gcmVzcG9uc2U7XG5cdFx0fSlcblx0XHQuY2F0Y2goZXJyb3IgPT4ge1xuXHRcdFx0aWYgKCF1cmwubWF0Y2goL1xcLmh0bWw/JC9pKSkge1xuXHRcdFx0XHRjb25zb2xlLmVycm9yKGVycm9yKTtcblx0XHRcdH1cblxuXHRcdFx0dGhyb3cgZXJyb3I7XG5cdFx0fSk7XG59O1xuYDtcblxuY29uc3QgY29uZmlnTmF2aWdhdGlvbkhhbmRsZXIgPSBgXG5pZiAod2luZG93Lm5hdmlnYXRpb24gJiYgd2luZG93LnNlbGYgIT09IHdpbmRvdy50b3ApIHtcblx0d2luZG93Lm5hdmlnYXRpb24uYWRkRXZlbnRMaXN0ZW5lcignbmF2aWdhdGUnLCAoZXZlbnQpID0+IHtcblx0XHRjb25zdCB1cmwgPSBldmVudC5kZXN0aW5hdGlvbi51cmw7XG5cblx0XHR0cnkge1xuXHRcdFx0Y29uc3QgZGVzdGluYXRpb25VcmwgPSBuZXcgVVJMKHVybCk7XG5cdFx0XHRjb25zdCBkZXN0aW5hdGlvbk9yaWdpbiA9IGRlc3RpbmF0aW9uVXJsLm9yaWdpbjtcblx0XHRcdGNvbnN0IGN1cnJlbnRPcmlnaW4gPSB3aW5kb3cubG9jYXRpb24ub3JpZ2luO1xuXG5cdFx0XHRpZiAoZGVzdGluYXRpb25PcmlnaW4gPT09IGN1cnJlbnRPcmlnaW4pIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdH0gY2F0Y2ggKGVycm9yKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0d2luZG93LnBhcmVudC5wb3N0TWVzc2FnZSh7XG5cdFx0XHR0eXBlOiAnaG9yaXpvbnMtbmF2aWdhdGlvbi1lcnJvcicsXG5cdFx0XHR1cmwsXG5cdFx0fSwgJyonKTtcblx0fSk7XG59XG5gO1xuXG5jb25zdCBhZGRUcmFuc2Zvcm1JbmRleEh0bWwgPSB7XG5cdG5hbWU6ICdhZGQtdHJhbnNmb3JtLWluZGV4LWh0bWwnLFxuXHR0cmFuc2Zvcm1JbmRleEh0bWwoaHRtbCkge1xuXHRcdGNvbnN0IHRhZ3MgPSBbXG5cdFx0XHR7XG5cdFx0XHRcdHRhZzogJ3NjcmlwdCcsXG5cdFx0XHRcdGF0dHJzOiB7IHR5cGU6ICdtb2R1bGUnIH0sXG5cdFx0XHRcdGNoaWxkcmVuOiBjb25maWdIb3Jpem9uc1J1bnRpbWVFcnJvckhhbmRsZXIsXG5cdFx0XHRcdGluamVjdFRvOiAnaGVhZCcsXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHR0YWc6ICdzY3JpcHQnLFxuXHRcdFx0XHRhdHRyczogeyB0eXBlOiAnbW9kdWxlJyB9LFxuXHRcdFx0XHRjaGlsZHJlbjogY29uZmlnSG9yaXpvbnNWaXRlRXJyb3JIYW5kbGVyLFxuXHRcdFx0XHRpbmplY3RUbzogJ2hlYWQnLFxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0dGFnOiAnc2NyaXB0Jyxcblx0XHRcdFx0YXR0cnM6IHt0eXBlOiAnbW9kdWxlJ30sXG5cdFx0XHRcdGNoaWxkcmVuOiBjb25maWdIb3Jpem9uc0NvbnNvbGVFcnJyb0hhbmRsZXIsXG5cdFx0XHRcdGluamVjdFRvOiAnaGVhZCcsXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHR0YWc6ICdzY3JpcHQnLFxuXHRcdFx0XHRhdHRyczogeyB0eXBlOiAnbW9kdWxlJyB9LFxuXHRcdFx0XHRjaGlsZHJlbjogY29uZmlnV2luZG93RmV0Y2hNb25rZXlQYXRjaCxcblx0XHRcdFx0aW5qZWN0VG86ICdoZWFkJyxcblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdHRhZzogJ3NjcmlwdCcsXG5cdFx0XHRcdGF0dHJzOiB7IHR5cGU6ICdtb2R1bGUnIH0sXG5cdFx0XHRcdGNoaWxkcmVuOiBjb25maWdOYXZpZ2F0aW9uSGFuZGxlcixcblx0XHRcdFx0aW5qZWN0VG86ICdoZWFkJyxcblx0XHRcdH0sXG5cdFx0XTtcblxuXHRcdGlmICghaXNEZXYgJiYgcHJvY2Vzcy5lbnYuVEVNUExBVEVfQkFOTkVSX1NDUklQVF9VUkwgJiYgcHJvY2Vzcy5lbnYuVEVNUExBVEVfUkVESVJFQ1RfVVJMKSB7XG5cdFx0XHR0YWdzLnB1c2goXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0YWc6ICdzY3JpcHQnLFxuXHRcdFx0XHRcdGF0dHJzOiB7XG5cdFx0XHRcdFx0XHRzcmM6IHByb2Nlc3MuZW52LlRFTVBMQVRFX0JBTk5FUl9TQ1JJUFRfVVJMLFxuXHRcdFx0XHRcdFx0J3RlbXBsYXRlLXJlZGlyZWN0LXVybCc6IHByb2Nlc3MuZW52LlRFTVBMQVRFX1JFRElSRUNUX1VSTCxcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdGluamVjdFRvOiAnaGVhZCcsXG5cdFx0XHRcdH1cblx0XHRcdCk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHtcblx0XHRcdGh0bWwsXG5cdFx0XHR0YWdzLFxuXHRcdH07XG5cdH0sXG59O1xuXG5jb25zb2xlLndhcm4gPSAoKSA9PiB7fTtcblxuY29uc3QgbG9nZ2VyID0gY3JlYXRlTG9nZ2VyKClcbmNvbnN0IGxvZ2dlckVycm9yID0gbG9nZ2VyLmVycm9yXG5cbmxvZ2dlci5lcnJvciA9IChtc2csIG9wdGlvbnMpID0+IHtcblx0aWYgKG9wdGlvbnM/LmVycm9yPy50b1N0cmluZygpLmluY2x1ZGVzKCdDc3NTeW50YXhFcnJvcjogW3Bvc3Rjc3NdJykpIHtcblx0XHRyZXR1cm47XG5cdH1cblxuXHRsb2dnZXJFcnJvcihtc2csIG9wdGlvbnMpO1xufVxuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuXHRjdXN0b21Mb2dnZXI6IGxvZ2dlcixcblx0cGx1Z2luczogW1xuXHRcdC4uLihpc0RldiA/IFtpbmxpbmVFZGl0UGx1Z2luKCksIGVkaXRNb2RlRGV2UGx1Z2luKCksIGlmcmFtZVJvdXRlUmVzdG9yYXRpb25QbHVnaW4oKSwgc2VsZWN0aW9uTW9kZVBsdWdpbigpXSA6IFtdKSxcblx0XHRyZWFjdCgpLFxuXHRcdGFkZFRyYW5zZm9ybUluZGV4SHRtbFxuXHRdLFxuXHRzZXJ2ZXI6IHtcblx0XHRjb3JzOiB0cnVlLFxuXHRcdGhlYWRlcnM6IHtcblx0XHRcdCdDcm9zcy1PcmlnaW4tRW1iZWRkZXItUG9saWN5JzogJ2NyZWRlbnRpYWxsZXNzJyxcblx0XHR9LFxuXHRcdGFsbG93ZWRIb3N0czogdHJ1ZSxcblx0fSxcblx0cmVzb2x2ZToge1xuXHRcdGV4dGVuc2lvbnM6IFsnLmpzeCcsICcuanMnLCAnLnRzeCcsICcudHMnLCAnLmpzb24nLCBdLFxuXHRcdGFsaWFzOiB7XG5cdFx0XHQnQCc6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuL3NyYycpLFxuXHRcdH0sXG5cdH0sXG5cdGJ1aWxkOiB7XG5cdFx0cm9sbHVwT3B0aW9uczoge1xuXHRcdFx0ZXh0ZXJuYWw6IFtcblx0XHRcdFx0J0BiYWJlbC9wYXJzZXInLFxuXHRcdFx0XHQnQGJhYmVsL3RyYXZlcnNlJyxcblx0XHRcdFx0J0BiYWJlbC9nZW5lcmF0b3InLFxuXHRcdFx0XHQnQGJhYmVsL3R5cGVzJ1xuXHRcdFx0XVxuXHRcdH1cblx0fVxufSk7XG4iLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXENvbXB1dGlhLm1lXFxcXERlc2t0b3BcXFxcU2hhcmVkIERvY3NcXFxcUmVhZHluZXN0IFdlYkFwcFxcXFxwbHVnaW5zXFxcXHZpc3VhbC1lZGl0b3JcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXENvbXB1dGlhLm1lXFxcXERlc2t0b3BcXFxcU2hhcmVkIERvY3NcXFxcUmVhZHluZXN0IFdlYkFwcFxcXFxwbHVnaW5zXFxcXHZpc3VhbC1lZGl0b3JcXFxcdml0ZS1wbHVnaW4tcmVhY3QtaW5saW5lLWVkaXRvci5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvQ29tcHV0aWEubWUvRGVza3RvcC9TaGFyZWQlMjBEb2NzL1JlYWR5bmVzdCUyMFdlYkFwcC9wbHVnaW5zL3Zpc3VhbC1lZGl0b3Ivdml0ZS1wbHVnaW4tcmVhY3QtaW5saW5lLWVkaXRvci5qc1wiO2ltcG9ydCBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgcGFyc2UgfSBmcm9tICdAYmFiZWwvcGFyc2VyJztcbmltcG9ydCB0cmF2ZXJzZUJhYmVsIGZyb20gJ0BiYWJlbC90cmF2ZXJzZSc7XG5pbXBvcnQgKiBhcyB0IGZyb20gJ0BiYWJlbC90eXBlcyc7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHsgXG5cdHZhbGlkYXRlRmlsZVBhdGgsIFxuXHRwYXJzZUZpbGVUb0FTVCwgXG5cdGZpbmRKU1hFbGVtZW50QXRQb3NpdGlvbixcblx0Z2VuZXJhdGVDb2RlLFxuXHRnZW5lcmF0ZVNvdXJjZVdpdGhNYXAsXG5cdFZJVEVfUFJPSkVDVF9ST09UXG59IGZyb20gJy4uL3V0aWxzL2FzdC11dGlscy5qcyc7XG5cbmNvbnN0IEVESVRBQkxFX0hUTUxfVEFHUyA9IFtcImFcIiwgXCJCdXR0b25cIiwgXCJidXR0b25cIiwgXCJwXCIsIFwic3BhblwiLCBcImgxXCIsIFwiaDJcIiwgXCJoM1wiLCBcImg0XCIsIFwiaDVcIiwgXCJoNlwiLCBcImxhYmVsXCIsIFwiTGFiZWxcIiwgXCJpbWdcIl07XG5cbmZ1bmN0aW9uIHBhcnNlRWRpdElkKGVkaXRJZCkge1xuXHRjb25zdCBwYXJ0cyA9IGVkaXRJZC5zcGxpdCgnOicpO1xuXG5cdGlmIChwYXJ0cy5sZW5ndGggPCAzKSB7XG5cdFx0cmV0dXJuIG51bGw7XG5cdH1cblxuXHRjb25zdCBjb2x1bW4gPSBwYXJzZUludChwYXJ0cy5hdCgtMSksIDEwKTtcblx0Y29uc3QgbGluZSA9IHBhcnNlSW50KHBhcnRzLmF0KC0yKSwgMTApO1xuXHRjb25zdCBmaWxlUGF0aCA9IHBhcnRzLnNsaWNlKDAsIC0yKS5qb2luKCc6Jyk7XG5cblx0aWYgKCFmaWxlUGF0aCB8fCBpc05hTihsaW5lKSB8fCBpc05hTihjb2x1bW4pKSB7XG5cdFx0cmV0dXJuIG51bGw7XG5cdH1cblxuXHRyZXR1cm4geyBmaWxlUGF0aCwgbGluZSwgY29sdW1uIH07XG59XG5cbmZ1bmN0aW9uIGNoZWNrVGFnTmFtZUVkaXRhYmxlKG9wZW5pbmdFbGVtZW50Tm9kZSwgZWRpdGFibGVUYWdzTGlzdCkge1xuXHRpZiAoIW9wZW5pbmdFbGVtZW50Tm9kZSB8fCAhb3BlbmluZ0VsZW1lbnROb2RlLm5hbWUpIHJldHVybiBmYWxzZTtcblx0Y29uc3QgbmFtZU5vZGUgPSBvcGVuaW5nRWxlbWVudE5vZGUubmFtZTtcblxuXHQvLyBDaGVjayAxOiBEaXJlY3QgbmFtZSAoZm9yIDxwPiwgPEJ1dHRvbj4pXG5cdGlmIChuYW1lTm9kZS50eXBlID09PSAnSlNYSWRlbnRpZmllcicgJiYgZWRpdGFibGVUYWdzTGlzdC5pbmNsdWRlcyhuYW1lTm9kZS5uYW1lKSkge1xuXHRcdHJldHVybiB0cnVlO1xuXHR9XG5cblx0Ly8gQ2hlY2sgMjogUHJvcGVydHkgbmFtZSBvZiBhIG1lbWJlciBleHByZXNzaW9uIChmb3IgPG1vdGlvbi5oMT4sIGNoZWNrIGlmIFwiaDFcIiBpcyBpbiBlZGl0YWJsZVRhZ3NMaXN0KVxuXHRpZiAobmFtZU5vZGUudHlwZSA9PT0gJ0pTWE1lbWJlckV4cHJlc3Npb24nICYmIG5hbWVOb2RlLnByb3BlcnR5ICYmIG5hbWVOb2RlLnByb3BlcnR5LnR5cGUgPT09ICdKU1hJZGVudGlmaWVyJyAmJiBlZGl0YWJsZVRhZ3NMaXN0LmluY2x1ZGVzKG5hbWVOb2RlLnByb3BlcnR5Lm5hbWUpKSB7XG5cdFx0cmV0dXJuIHRydWU7XG5cdH1cblxuXHRyZXR1cm4gZmFsc2U7XG59XG5cbmZ1bmN0aW9uIHZhbGlkYXRlSW1hZ2VTcmMob3BlbmluZ05vZGUpIHtcblx0aWYgKCFvcGVuaW5nTm9kZSB8fCAhb3BlbmluZ05vZGUubmFtZSB8fCAoIG9wZW5pbmdOb2RlLm5hbWUubmFtZSAhPT0gJ2ltZycgJiYgb3BlbmluZ05vZGUubmFtZS5wcm9wZXJ0eT8ubmFtZSAhPT0gJ2ltZycpKSB7XG5cdFx0cmV0dXJuIHsgaXNWYWxpZDogdHJ1ZSwgcmVhc29uOiBudWxsIH07IC8vIE5vdCBhbiBpbWFnZSwgc2tpcCB2YWxpZGF0aW9uXG5cdH1cblxuXHRjb25zdCBoYXNQcm9wc1NwcmVhZCA9IG9wZW5pbmdOb2RlLmF0dHJpYnV0ZXMuc29tZShhdHRyID0+XG5cdFx0dC5pc0pTWFNwcmVhZEF0dHJpYnV0ZShhdHRyKSAmJlxuXHRcdGF0dHIuYXJndW1lbnQgJiZcblx0XHR0LmlzSWRlbnRpZmllcihhdHRyLmFyZ3VtZW50KSAmJlxuXHRcdGF0dHIuYXJndW1lbnQubmFtZSA9PT0gJ3Byb3BzJ1xuXHQpO1xuXG5cdGlmIChoYXNQcm9wc1NwcmVhZCkge1xuXHRcdHJldHVybiB7IGlzVmFsaWQ6IGZhbHNlLCByZWFzb246ICdwcm9wcy1zcHJlYWQnIH07XG5cdH1cblxuXHRjb25zdCBzcmNBdHRyID0gb3BlbmluZ05vZGUuYXR0cmlidXRlcy5maW5kKGF0dHIgPT5cblx0XHR0LmlzSlNYQXR0cmlidXRlKGF0dHIpICYmXG5cdFx0YXR0ci5uYW1lICYmXG5cdFx0YXR0ci5uYW1lLm5hbWUgPT09ICdzcmMnXG5cdCk7XG5cblx0aWYgKCFzcmNBdHRyKSB7XG5cdFx0cmV0dXJuIHsgaXNWYWxpZDogZmFsc2UsIHJlYXNvbjogJ21pc3Npbmctc3JjJyB9O1xuXHR9XG5cblx0aWYgKCF0LmlzU3RyaW5nTGl0ZXJhbChzcmNBdHRyLnZhbHVlKSkge1xuXHRcdHJldHVybiB7IGlzVmFsaWQ6IGZhbHNlLCByZWFzb246ICdkeW5hbWljLXNyYycgfTtcblx0fVxuXG5cdGlmICghc3JjQXR0ci52YWx1ZS52YWx1ZSB8fCBzcmNBdHRyLnZhbHVlLnZhbHVlLnRyaW0oKSA9PT0gJycpIHtcblx0XHRyZXR1cm4geyBpc1ZhbGlkOiBmYWxzZSwgcmVhc29uOiAnZW1wdHktc3JjJyB9O1xuXHR9XG5cblx0cmV0dXJuIHsgaXNWYWxpZDogdHJ1ZSwgcmVhc29uOiBudWxsIH07XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGlubGluZUVkaXRQbHVnaW4oKSB7XG5cdHJldHVybiB7XG5cdFx0bmFtZTogJ3ZpdGUtaW5saW5lLWVkaXQtcGx1Z2luJyxcblx0XHRlbmZvcmNlOiAncHJlJyxcblxuXHRcdHRyYW5zZm9ybShjb2RlLCBpZCkge1xuXHRcdFx0aWYgKCEvXFwuKGpzeHx0c3gpJC8udGVzdChpZCkgfHwgIWlkLnN0YXJ0c1dpdGgoVklURV9QUk9KRUNUX1JPT1QpIHx8IGlkLmluY2x1ZGVzKCdub2RlX21vZHVsZXMnKSkge1xuXHRcdFx0XHRyZXR1cm4gbnVsbDtcblx0XHRcdH1cblxuXHRcdFx0Y29uc3QgcmVsYXRpdmVGaWxlUGF0aCA9IHBhdGgucmVsYXRpdmUoVklURV9QUk9KRUNUX1JPT1QsIGlkKTtcblx0XHRcdGNvbnN0IHdlYlJlbGF0aXZlRmlsZVBhdGggPSByZWxhdGl2ZUZpbGVQYXRoLnNwbGl0KHBhdGguc2VwKS5qb2luKCcvJyk7XG5cblx0XHRcdHRyeSB7XG5cdFx0XHRcdGNvbnN0IGJhYmVsQXN0ID0gcGFyc2UoY29kZSwge1xuXHRcdFx0XHRcdHNvdXJjZVR5cGU6ICdtb2R1bGUnLFxuXHRcdFx0XHRcdHBsdWdpbnM6IFsnanN4JywgJ3R5cGVzY3JpcHQnXSxcblx0XHRcdFx0XHRlcnJvclJlY292ZXJ5OiB0cnVlXG5cdFx0XHRcdH0pO1xuXG5cdFx0XHRcdGxldCBhdHRyaWJ1dGVzQWRkZWQgPSAwO1xuXG5cdFx0XHRcdHRyYXZlcnNlQmFiZWwuZGVmYXVsdChiYWJlbEFzdCwge1xuXHRcdFx0XHRcdGVudGVyKHBhdGgpIHtcblx0XHRcdFx0XHRcdGlmIChwYXRoLmlzSlNYT3BlbmluZ0VsZW1lbnQoKSkge1xuXHRcdFx0XHRcdFx0XHRjb25zdCBvcGVuaW5nTm9kZSA9IHBhdGgubm9kZTtcblx0XHRcdFx0XHRcdFx0Y29uc3QgZWxlbWVudE5vZGUgPSBwYXRoLnBhcmVudFBhdGgubm9kZTsgLy8gVGhlIEpTWEVsZW1lbnQgaXRzZWxmXG5cblx0XHRcdFx0XHRcdFx0aWYgKCFvcGVuaW5nTm9kZS5sb2MpIHtcblx0XHRcdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0XHRjb25zdCBhbHJlYWR5SGFzSWQgPSBvcGVuaW5nTm9kZS5hdHRyaWJ1dGVzLnNvbWUoXG5cdFx0XHRcdFx0XHRcdFx0KGF0dHIpID0+IHQuaXNKU1hBdHRyaWJ1dGUoYXR0cikgJiYgYXR0ci5uYW1lLm5hbWUgPT09ICdkYXRhLWVkaXQtaWQnXG5cdFx0XHRcdFx0XHRcdCk7XG5cblx0XHRcdFx0XHRcdFx0aWYgKGFscmVhZHlIYXNJZCkge1xuXHRcdFx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRcdC8vIENvbmRpdGlvbiAxOiBJcyB0aGUgY3VycmVudCBlbGVtZW50IHRhZyB0eXBlIGVkaXRhYmxlP1xuXHRcdFx0XHRcdFx0XHRjb25zdCBpc0N1cnJlbnRFbGVtZW50RWRpdGFibGUgPSBjaGVja1RhZ05hbWVFZGl0YWJsZShvcGVuaW5nTm9kZSwgRURJVEFCTEVfSFRNTF9UQUdTKTtcblx0XHRcdFx0XHRcdFx0aWYgKCFpc0N1cnJlbnRFbGVtZW50RWRpdGFibGUpIHtcblx0XHRcdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0XHRjb25zdCBpbWFnZVZhbGlkYXRpb24gPSB2YWxpZGF0ZUltYWdlU3JjKG9wZW5pbmdOb2RlKTtcblx0XHRcdFx0XHRcdFx0aWYgKCFpbWFnZVZhbGlkYXRpb24uaXNWYWxpZCkge1xuXHRcdFx0XHRcdFx0XHRcdGNvbnN0IGRpc2FibGVkQXR0cmlidXRlID0gdC5qc3hBdHRyaWJ1dGUoXG5cdFx0XHRcdFx0XHRcdFx0XHR0LmpzeElkZW50aWZpZXIoJ2RhdGEtZWRpdC1kaXNhYmxlZCcpLFxuXHRcdFx0XHRcdFx0XHRcdFx0dC5zdHJpbmdMaXRlcmFsKCd0cnVlJylcblx0XHRcdFx0XHRcdFx0XHQpO1xuXHRcdFx0XHRcdFx0XHRcdG9wZW5pbmdOb2RlLmF0dHJpYnV0ZXMucHVzaChkaXNhYmxlZEF0dHJpYnV0ZSk7XG5cdFx0XHRcdFx0XHRcdFx0YXR0cmlidXRlc0FkZGVkKys7XG5cdFx0XHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdFx0bGV0IHNob3VsZEJlRGlzYWJsZWREdWVUb0NoaWxkcmVuID0gZmFsc2U7XG5cblx0XHRcdFx0XHRcdFx0Ly8gQ29uZGl0aW9uIDI6IERvZXMgdGhlIGVsZW1lbnQgaGF2ZSBkeW5hbWljIG9yIGVkaXRhYmxlIGNoaWxkcmVuXG5cdFx0XHRcdFx0XHRcdGlmICh0LmlzSlNYRWxlbWVudChlbGVtZW50Tm9kZSkgJiYgZWxlbWVudE5vZGUuY2hpbGRyZW4pIHtcblx0XHRcdFx0XHRcdFx0XHQvLyBDaGVjayBpZiBlbGVtZW50IGhhcyB7Li4ucHJvcHN9IHNwcmVhZCBhdHRyaWJ1dGUgLSBkaXNhYmxlIGVkaXRpbmcgaWYgaXQgZG9lc1xuXHRcdFx0XHRcdFx0XHRcdGNvbnN0IGhhc1Byb3BzU3ByZWFkID0gb3BlbmluZ05vZGUuYXR0cmlidXRlcy5zb21lKGF0dHIgPT4gdC5pc0pTWFNwcmVhZEF0dHJpYnV0ZShhdHRyKVxuXHRcdFx0XHRcdFx0XHRcdFx0JiYgYXR0ci5hcmd1bWVudFxuXHRcdFx0XHRcdFx0XHRcdFx0JiYgdC5pc0lkZW50aWZpZXIoYXR0ci5hcmd1bWVudClcblx0XHRcdFx0XHRcdFx0XHRcdCYmIGF0dHIuYXJndW1lbnQubmFtZSA9PT0gJ3Byb3BzJ1xuXHRcdFx0XHRcdFx0XHRcdCk7XG5cblx0XHRcdFx0XHRcdFx0XHRjb25zdCBoYXNEeW5hbWljQ2hpbGQgPSBlbGVtZW50Tm9kZS5jaGlsZHJlbi5zb21lKGNoaWxkID0+XG5cdFx0XHRcdFx0XHRcdFx0XHR0LmlzSlNYRXhwcmVzc2lvbkNvbnRhaW5lcihjaGlsZClcblx0XHRcdFx0XHRcdFx0XHQpO1xuXG5cdFx0XHRcdFx0XHRcdFx0aWYgKGhhc0R5bmFtaWNDaGlsZCB8fCBoYXNQcm9wc1NwcmVhZCkge1xuXHRcdFx0XHRcdFx0XHRcdFx0c2hvdWxkQmVEaXNhYmxlZER1ZVRvQ2hpbGRyZW4gPSB0cnVlO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRcdGlmICghc2hvdWxkQmVEaXNhYmxlZER1ZVRvQ2hpbGRyZW4gJiYgdC5pc0pTWEVsZW1lbnQoZWxlbWVudE5vZGUpICYmIGVsZW1lbnROb2RlLmNoaWxkcmVuKSB7XG5cdFx0XHRcdFx0XHRcdFx0Y29uc3QgaGFzRWRpdGFibGVKc3hDaGlsZCA9IGVsZW1lbnROb2RlLmNoaWxkcmVuLnNvbWUoY2hpbGQgPT4ge1xuXHRcdFx0XHRcdFx0XHRcdFx0aWYgKHQuaXNKU1hFbGVtZW50KGNoaWxkKSkge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRyZXR1cm4gY2hlY2tUYWdOYW1lRWRpdGFibGUoY2hpbGQub3BlbmluZ0VsZW1lbnQsIEVESVRBQkxFX0hUTUxfVEFHUyk7XG5cdFx0XHRcdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0XHRcdFx0XHR9KTtcblxuXHRcdFx0XHRcdFx0XHRcdGlmIChoYXNFZGl0YWJsZUpzeENoaWxkKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRzaG91bGRCZURpc2FibGVkRHVlVG9DaGlsZHJlbiA9IHRydWU7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdFx0aWYgKHNob3VsZEJlRGlzYWJsZWREdWVUb0NoaWxkcmVuKSB7XG5cdFx0XHRcdFx0XHRcdFx0Y29uc3QgZGlzYWJsZWRBdHRyaWJ1dGUgPSB0LmpzeEF0dHJpYnV0ZShcblx0XHRcdFx0XHRcdFx0XHRcdHQuanN4SWRlbnRpZmllcignZGF0YS1lZGl0LWRpc2FibGVkJyksXG5cdFx0XHRcdFx0XHRcdFx0XHR0LnN0cmluZ0xpdGVyYWwoJ3RydWUnKVxuXHRcdFx0XHRcdFx0XHRcdCk7XG5cblx0XHRcdFx0XHRcdFx0XHRvcGVuaW5nTm9kZS5hdHRyaWJ1dGVzLnB1c2goZGlzYWJsZWRBdHRyaWJ1dGUpO1xuXHRcdFx0XHRcdFx0XHRcdGF0dHJpYnV0ZXNBZGRlZCsrO1xuXHRcdFx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRcdC8vIENvbmRpdGlvbiAzOiBQYXJlbnQgaXMgbm9uLWVkaXRhYmxlIGlmIEFUIExFQVNUIE9ORSBjaGlsZCBKU1hFbGVtZW50IGlzIGEgbm9uLWVkaXRhYmxlIHR5cGUuXG5cdFx0XHRcdFx0XHRcdGlmICh0LmlzSlNYRWxlbWVudChlbGVtZW50Tm9kZSkgJiYgZWxlbWVudE5vZGUuY2hpbGRyZW4gJiYgZWxlbWVudE5vZGUuY2hpbGRyZW4ubGVuZ3RoID4gMCkge1xuXHRcdFx0XHRcdFx0XHRcdGxldCBoYXNOb25FZGl0YWJsZUpzeENoaWxkID0gZmFsc2U7XG5cdFx0XHRcdFx0XHRcdFx0Zm9yIChjb25zdCBjaGlsZCBvZiBlbGVtZW50Tm9kZS5jaGlsZHJlbikge1xuXHRcdFx0XHRcdFx0XHRcdFx0aWYgKHQuaXNKU1hFbGVtZW50KGNoaWxkKSkge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRpZiAoIWNoZWNrVGFnTmFtZUVkaXRhYmxlKGNoaWxkLm9wZW5pbmdFbGVtZW50LCBFRElUQUJMRV9IVE1MX1RBR1MpKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0aGFzTm9uRWRpdGFibGVKc3hDaGlsZCA9IHRydWU7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0aWYgKGhhc05vbkVkaXRhYmxlSnN4Q2hpbGQpIHtcblx0XHRcdFx0XHRcdFx0XHRcdGNvbnN0IGRpc2FibGVkQXR0cmlidXRlID0gdC5qc3hBdHRyaWJ1dGUoXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHQuanN4SWRlbnRpZmllcignZGF0YS1lZGl0LWRpc2FibGVkJyksXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHQuc3RyaW5nTGl0ZXJhbChcInRydWVcIilcblx0XHRcdFx0XHRcdFx0XHRcdCk7XG5cdFx0XHRcdFx0XHRcdFx0XHRvcGVuaW5nTm9kZS5hdHRyaWJ1dGVzLnB1c2goZGlzYWJsZWRBdHRyaWJ1dGUpO1xuXHRcdFx0XHRcdFx0XHRcdFx0YXR0cmlidXRlc0FkZGVkKys7XG5cdFx0XHRcdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdFx0Ly8gQ29uZGl0aW9uIDQ6IElzIGFueSBhbmNlc3RvciBKU1hFbGVtZW50IGFsc28gZWRpdGFibGU/XG5cdFx0XHRcdFx0XHRcdGxldCBjdXJyZW50QW5jZXN0b3JDYW5kaWRhdGVQYXRoID0gcGF0aC5wYXJlbnRQYXRoLnBhcmVudFBhdGg7XG5cdFx0XHRcdFx0XHRcdHdoaWxlIChjdXJyZW50QW5jZXN0b3JDYW5kaWRhdGVQYXRoKSB7XG5cdFx0XHRcdFx0XHRcdFx0Y29uc3QgYW5jZXN0b3JKc3hFbGVtZW50UGF0aCA9IGN1cnJlbnRBbmNlc3RvckNhbmRpZGF0ZVBhdGguaXNKU1hFbGVtZW50KClcblx0XHRcdFx0XHRcdFx0XHRcdD8gY3VycmVudEFuY2VzdG9yQ2FuZGlkYXRlUGF0aFxuXHRcdFx0XHRcdFx0XHRcdFx0OiBjdXJyZW50QW5jZXN0b3JDYW5kaWRhdGVQYXRoLmZpbmRQYXJlbnQocCA9PiBwLmlzSlNYRWxlbWVudCgpKTtcblxuXHRcdFx0XHRcdFx0XHRcdGlmICghYW5jZXN0b3JKc3hFbGVtZW50UGF0aCkge1xuXHRcdFx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRcdFx0aWYgKGNoZWNrVGFnTmFtZUVkaXRhYmxlKGFuY2VzdG9ySnN4RWxlbWVudFBhdGgubm9kZS5vcGVuaW5nRWxlbWVudCwgRURJVEFCTEVfSFRNTF9UQUdTKSkge1xuXHRcdFx0XHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHRjdXJyZW50QW5jZXN0b3JDYW5kaWRhdGVQYXRoID0gYW5jZXN0b3JKc3hFbGVtZW50UGF0aC5wYXJlbnRQYXRoO1xuXHRcdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdFx0Y29uc3QgbGluZSA9IG9wZW5pbmdOb2RlLmxvYy5zdGFydC5saW5lO1xuXHRcdFx0XHRcdFx0XHRjb25zdCBjb2x1bW4gPSBvcGVuaW5nTm9kZS5sb2Muc3RhcnQuY29sdW1uICsgMTtcblx0XHRcdFx0XHRcdFx0Y29uc3QgZWRpdElkID0gYCR7d2ViUmVsYXRpdmVGaWxlUGF0aH06JHtsaW5lfToke2NvbHVtbn1gO1xuXG5cdFx0XHRcdFx0XHRcdGNvbnN0IGlkQXR0cmlidXRlID0gdC5qc3hBdHRyaWJ1dGUoXG5cdFx0XHRcdFx0XHRcdFx0dC5qc3hJZGVudGlmaWVyKCdkYXRhLWVkaXQtaWQnKSxcblx0XHRcdFx0XHRcdFx0XHR0LnN0cmluZ0xpdGVyYWwoZWRpdElkKVxuXHRcdFx0XHRcdFx0XHQpO1xuXG5cdFx0XHRcdFx0XHRcdG9wZW5pbmdOb2RlLmF0dHJpYnV0ZXMucHVzaChpZEF0dHJpYnV0ZSk7XG5cdFx0XHRcdFx0XHRcdGF0dHJpYnV0ZXNBZGRlZCsrO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSk7XG5cblx0XHRcdFx0aWYgKGF0dHJpYnV0ZXNBZGRlZCA+IDApIHtcblx0XHRcdFx0XHRjb25zdCBvdXRwdXQgPSBnZW5lcmF0ZVNvdXJjZVdpdGhNYXAoYmFiZWxBc3QsIHdlYlJlbGF0aXZlRmlsZVBhdGgsIGNvZGUpO1xuXHRcdFx0XHRcdHJldHVybiB7IGNvZGU6IG91dHB1dC5jb2RlLCBtYXA6IG91dHB1dC5tYXAgfTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHJldHVybiBudWxsO1xuXHRcdFx0fSBjYXRjaCAoZXJyb3IpIHtcblx0XHRcdFx0Y29uc29sZS5lcnJvcihgW3ZpdGVdW3Zpc3VhbC1lZGl0b3JdIEVycm9yIHRyYW5zZm9ybWluZyAke2lkfTpgLCBlcnJvcik7XG5cdFx0XHRcdHJldHVybiBudWxsO1xuXHRcdFx0fVxuXHRcdH0sXG5cblxuXHRcdC8vIFVwZGF0ZXMgc291cmNlIGNvZGUgYmFzZWQgb24gdGhlIGNoYW5nZXMgcmVjZWl2ZWQgZnJvbSB0aGUgY2xpZW50XG5cdFx0Y29uZmlndXJlU2VydmVyKHNlcnZlcikge1xuXHRcdFx0c2VydmVyLm1pZGRsZXdhcmVzLnVzZSgnL2FwaS9hcHBseS1lZGl0JywgYXN5bmMgKHJlcSwgcmVzLCBuZXh0KSA9PiB7XG5cdFx0XHRcdGlmIChyZXEubWV0aG9kICE9PSAnUE9TVCcpIHJldHVybiBuZXh0KCk7XG5cblx0XHRcdFx0bGV0IGJvZHkgPSAnJztcblx0XHRcdFx0cmVxLm9uKCdkYXRhJywgY2h1bmsgPT4geyBib2R5ICs9IGNodW5rLnRvU3RyaW5nKCk7IH0pO1xuXG5cdFx0XHRcdHJlcS5vbignZW5kJywgYXN5bmMgKCkgPT4ge1xuXHRcdFx0XHRcdGxldCBhYnNvbHV0ZUZpbGVQYXRoID0gJyc7XG5cdFx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRcdGNvbnN0IHsgZWRpdElkLCBuZXdGdWxsVGV4dCB9ID0gSlNPTi5wYXJzZShib2R5KTtcblxuXHRcdFx0XHRcdFx0aWYgKCFlZGl0SWQgfHwgdHlwZW9mIG5ld0Z1bGxUZXh0ID09PSAndW5kZWZpbmVkJykge1xuXHRcdFx0XHRcdFx0XHRyZXMud3JpdGVIZWFkKDQwMCwgeyAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nIH0pO1xuXHRcdFx0XHRcdFx0XHRyZXR1cm4gcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IGVycm9yOiAnTWlzc2luZyBlZGl0SWQgb3IgbmV3RnVsbFRleHQnIH0pKTtcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0Y29uc3QgcGFyc2VkSWQgPSBwYXJzZUVkaXRJZChlZGl0SWQpO1xuXHRcdFx0XHRcdFx0aWYgKCFwYXJzZWRJZCkge1xuXHRcdFx0XHRcdFx0XHRyZXMud3JpdGVIZWFkKDQwMCwgeyAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nIH0pO1xuXHRcdFx0XHRcdFx0XHRyZXR1cm4gcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IGVycm9yOiAnSW52YWxpZCBlZGl0SWQgZm9ybWF0IChmaWxlUGF0aDpsaW5lOmNvbHVtbiknIH0pKTtcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0Y29uc3QgeyBmaWxlUGF0aCwgbGluZSwgY29sdW1uIH0gPSBwYXJzZWRJZDtcblxuXHRcdFx0XHRcdFx0Ly8gVmFsaWRhdGUgZmlsZSBwYXRoXG5cdFx0XHRcdFx0XHRjb25zdCB2YWxpZGF0aW9uID0gdmFsaWRhdGVGaWxlUGF0aChmaWxlUGF0aCk7XG5cdFx0XHRcdFx0XHRpZiAoIXZhbGlkYXRpb24uaXNWYWxpZCkge1xuXHRcdFx0XHRcdFx0XHRyZXMud3JpdGVIZWFkKDQwMCwgeyAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nIH0pO1xuXHRcdFx0XHRcdFx0XHRyZXR1cm4gcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IGVycm9yOiB2YWxpZGF0aW9uLmVycm9yIH0pKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGFic29sdXRlRmlsZVBhdGggPSB2YWxpZGF0aW9uLmFic29sdXRlUGF0aDtcblxuXHRcdFx0XHRcdFx0Ly8gUGFyc2UgQVNUXG5cdFx0XHRcdFx0XHRjb25zdCBvcmlnaW5hbENvbnRlbnQgPSBmcy5yZWFkRmlsZVN5bmMoYWJzb2x1dGVGaWxlUGF0aCwgJ3V0Zi04Jyk7XG5cdFx0XHRcdFx0XHRjb25zdCBiYWJlbEFzdCA9IHBhcnNlRmlsZVRvQVNUKGFic29sdXRlRmlsZVBhdGgpO1xuXG5cdFx0XHRcdFx0XHQvLyBGaW5kIHRhcmdldCBub2RlIChub3RlOiBhcHBseS1lZGl0IHVzZXMgY29sdW1uKzEpXG5cdFx0XHRcdFx0XHRjb25zdCB0YXJnZXROb2RlUGF0aCA9IGZpbmRKU1hFbGVtZW50QXRQb3NpdGlvbihiYWJlbEFzdCwgbGluZSwgY29sdW1uICsgMSk7XG5cblx0XHRcdFx0XHRcdGlmICghdGFyZ2V0Tm9kZVBhdGgpIHtcblx0XHRcdFx0XHRcdFx0cmVzLndyaXRlSGVhZCg0MDQsIHsgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyB9KTtcblx0XHRcdFx0XHRcdFx0cmV0dXJuIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogJ1RhcmdldCBub2RlIG5vdCBmb3VuZCBieSBsaW5lL2NvbHVtbicsIGVkaXRJZCB9KSk7XG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdGNvbnN0IHRhcmdldE9wZW5pbmdFbGVtZW50ID0gdGFyZ2V0Tm9kZVBhdGgubm9kZTtcblx0XHRcdFx0XHRcdGNvbnN0IHBhcmVudEVsZW1lbnROb2RlID0gdGFyZ2V0Tm9kZVBhdGgucGFyZW50UGF0aD8ubm9kZTtcblxuXHRcdFx0XHRcdFx0Y29uc3QgaXNJbWFnZUVsZW1lbnQgPSB0YXJnZXRPcGVuaW5nRWxlbWVudC5uYW1lICYmIHRhcmdldE9wZW5pbmdFbGVtZW50Lm5hbWUubmFtZSA9PT0gJ2ltZyc7XG5cblx0XHRcdFx0XHRcdGxldCBiZWZvcmVDb2RlID0gJyc7XG5cdFx0XHRcdFx0XHRsZXQgYWZ0ZXJDb2RlID0gJyc7XG5cdFx0XHRcdFx0XHRsZXQgbW9kaWZpZWQgPSBmYWxzZTtcblxuXHRcdFx0XHRcdFx0aWYgKGlzSW1hZ2VFbGVtZW50KSB7XG5cdFx0XHRcdFx0XHRcdC8vIEhhbmRsZSBpbWFnZSBzcmMgYXR0cmlidXRlIHVwZGF0ZVxuXHRcdFx0XHRcdFx0XHRiZWZvcmVDb2RlID0gZ2VuZXJhdGVDb2RlKHRhcmdldE9wZW5pbmdFbGVtZW50KTtcblxuXHRcdFx0XHRcdFx0XHRjb25zdCBzcmNBdHRyID0gdGFyZ2V0T3BlbmluZ0VsZW1lbnQuYXR0cmlidXRlcy5maW5kKGF0dHIgPT5cblx0XHRcdFx0XHRcdFx0XHR0LmlzSlNYQXR0cmlidXRlKGF0dHIpICYmIGF0dHIubmFtZSAmJiBhdHRyLm5hbWUubmFtZSA9PT0gJ3NyYydcblx0XHRcdFx0XHRcdFx0KTtcblxuXHRcdFx0XHRcdFx0XHRpZiAoc3JjQXR0ciAmJiB0LmlzU3RyaW5nTGl0ZXJhbChzcmNBdHRyLnZhbHVlKSkge1xuXHRcdFx0XHRcdFx0XHRcdHNyY0F0dHIudmFsdWUgPSB0LnN0cmluZ0xpdGVyYWwobmV3RnVsbFRleHQpO1xuXHRcdFx0XHRcdFx0XHRcdG1vZGlmaWVkID0gdHJ1ZTtcblx0XHRcdFx0XHRcdFx0XHRhZnRlckNvZGUgPSBnZW5lcmF0ZUNvZGUodGFyZ2V0T3BlbmluZ0VsZW1lbnQpO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRpZiAocGFyZW50RWxlbWVudE5vZGUgJiYgdC5pc0pTWEVsZW1lbnQocGFyZW50RWxlbWVudE5vZGUpKSB7XG5cdFx0XHRcdFx0XHRcdFx0YmVmb3JlQ29kZSA9IGdlbmVyYXRlQ29kZShwYXJlbnRFbGVtZW50Tm9kZSk7XG5cblx0XHRcdFx0XHRcdFx0XHRwYXJlbnRFbGVtZW50Tm9kZS5jaGlsZHJlbiA9IFtdO1xuXHRcdFx0XHRcdFx0XHRcdGlmIChuZXdGdWxsVGV4dCAmJiBuZXdGdWxsVGV4dC50cmltKCkgIT09ICcnKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRjb25zdCBuZXdUZXh0Tm9kZSA9IHQuanN4VGV4dChuZXdGdWxsVGV4dCk7XG5cdFx0XHRcdFx0XHRcdFx0XHRwYXJlbnRFbGVtZW50Tm9kZS5jaGlsZHJlbi5wdXNoKG5ld1RleHROb2RlKTtcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0bW9kaWZpZWQgPSB0cnVlO1xuXHRcdFx0XHRcdFx0XHRcdGFmdGVyQ29kZSA9IGdlbmVyYXRlQ29kZShwYXJlbnRFbGVtZW50Tm9kZSk7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0aWYgKCFtb2RpZmllZCkge1xuXHRcdFx0XHRcdFx0XHRyZXMud3JpdGVIZWFkKDQwOSwgeyAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nIH0pO1xuXHRcdFx0XHRcdFx0XHRyZXR1cm4gcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IGVycm9yOiAnQ291bGQgbm90IGFwcGx5IGNoYW5nZXMgdG8gQVNULicgfSkpO1xuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRjb25zdCB3ZWJSZWxhdGl2ZUZpbGVQYXRoID0gcGF0aC5yZWxhdGl2ZShWSVRFX1BST0pFQ1RfUk9PVCwgYWJzb2x1dGVGaWxlUGF0aCkuc3BsaXQocGF0aC5zZXApLmpvaW4oJy8nKTtcblx0XHRcdFx0XHRcdGNvbnN0IG91dHB1dCA9IGdlbmVyYXRlU291cmNlV2l0aE1hcChiYWJlbEFzdCwgd2ViUmVsYXRpdmVGaWxlUGF0aCwgb3JpZ2luYWxDb250ZW50KTtcblx0XHRcdFx0XHRcdGNvbnN0IG5ld0NvbnRlbnQgPSBvdXRwdXQuY29kZTtcblxuXHRcdFx0XHRcdFx0cmVzLndyaXRlSGVhZCgyMDAsIHsgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyB9KTtcblx0XHRcdFx0XHRcdHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoe1xuXHRcdFx0XHRcdFx0XHRzdWNjZXNzOiB0cnVlLFxuXHRcdFx0XHRcdFx0XHRuZXdGaWxlQ29udGVudDogbmV3Q29udGVudCxcblx0XHRcdFx0XHRcdFx0YmVmb3JlQ29kZSxcblx0XHRcdFx0XHRcdFx0YWZ0ZXJDb2RlLFxuXHRcdFx0XHRcdFx0fSkpO1xuXG5cdFx0XHRcdFx0fSBjYXRjaCAoZXJyb3IpIHtcblx0XHRcdFx0XHRcdHJlcy53cml0ZUhlYWQoNTAwLCB7ICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicgfSk7XG5cdFx0XHRcdFx0XHRyZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6ICdJbnRlcm5hbCBzZXJ2ZXIgZXJyb3IgZHVyaW5nIGVkaXQgYXBwbGljYXRpb24uJyB9KSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KTtcblx0XHRcdH0pO1xuXHRcdH1cblx0fTtcbn0iLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXENvbXB1dGlhLm1lXFxcXERlc2t0b3BcXFxcU2hhcmVkIERvY3NcXFxcUmVhZHluZXN0IFdlYkFwcFxcXFxwbHVnaW5zXFxcXHV0aWxzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxDb21wdXRpYS5tZVxcXFxEZXNrdG9wXFxcXFNoYXJlZCBEb2NzXFxcXFJlYWR5bmVzdCBXZWJBcHBcXFxccGx1Z2luc1xcXFx1dGlsc1xcXFxhc3QtdXRpbHMuanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL0NvbXB1dGlhLm1lL0Rlc2t0b3AvU2hhcmVkJTIwRG9jcy9SZWFkeW5lc3QlMjBXZWJBcHAvcGx1Z2lucy91dGlscy9hc3QtdXRpbHMuanNcIjtpbXBvcnQgZnMgZnJvbSAnbm9kZTpmcyc7XG5pbXBvcnQgcGF0aCBmcm9tICdub2RlOnBhdGgnO1xuaW1wb3J0IHsgZmlsZVVSTFRvUGF0aCB9IGZyb20gJ25vZGU6dXJsJztcbmltcG9ydCBnZW5lcmF0ZSBmcm9tICdAYmFiZWwvZ2VuZXJhdG9yJztcbmltcG9ydCB7IHBhcnNlIH0gZnJvbSAnQGJhYmVsL3BhcnNlcic7XG5pbXBvcnQgdHJhdmVyc2VCYWJlbCBmcm9tICdAYmFiZWwvdHJhdmVyc2UnO1xuaW1wb3J0IHtcblx0aXNKU1hJZGVudGlmaWVyLFxuXHRpc0pTWE1lbWJlckV4cHJlc3Npb24sXG59IGZyb20gJ0BiYWJlbC90eXBlcyc7XG5cbmNvbnN0IF9fZmlsZW5hbWUgPSBmaWxlVVJMVG9QYXRoKGltcG9ydC5tZXRhLnVybCk7XG5jb25zdCBfX2Rpcm5hbWUgPSBwYXRoLmRpcm5hbWUoX19maWxlbmFtZSk7XG5jb25zdCBWSVRFX1BST0pFQ1RfUk9PVCA9IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLicpO1xuXG4vLyBCbGFja2xpc3Qgb2YgY29tcG9uZW50cyB0aGF0IHNob3VsZCBub3QgYmUgZXh0cmFjdGVkICh1dGlsaXR5L25vbi12aXN1YWwgY29tcG9uZW50cylcbmNvbnN0IENPTVBPTkVOVF9CTEFDS0xJU1QgPSBuZXcgU2V0KFtcblx0J0hlbG1ldCcsXG5cdCdIZWxtZXRQcm92aWRlcicsXG5cdCdIZWFkJyxcblx0J2hlYWQnLFxuXHQnTWV0YScsXG5cdCdtZXRhJyxcblx0J1NjcmlwdCcsXG5cdCdzY3JpcHQnLFxuXHQnTm9TY3JpcHQnLFxuXHQnbm9zY3JpcHQnLFxuXHQnU3R5bGUnLFxuXHQnc3R5bGUnLFxuXHQndGl0bGUnLFxuXHQnVGl0bGUnLFxuXHQnbGluaycsXG5cdCdMaW5rJyxcbl0pO1xuXG4vKipcbiAqIFZhbGlkYXRlcyB0aGF0IGEgZmlsZSBwYXRoIGlzIHNhZmUgdG8gYWNjZXNzXG4gKiBAcGFyYW0ge3N0cmluZ30gZmlsZVBhdGggLSBSZWxhdGl2ZSBmaWxlIHBhdGhcbiAqIEByZXR1cm5zIHt7IGlzVmFsaWQ6IGJvb2xlYW4sIGFic29sdXRlUGF0aD86IHN0cmluZywgZXJyb3I/OiBzdHJpbmcgfX0gLSBPYmplY3QgY29udGFpbmluZyB2YWxpZGF0aW9uIHJlc3VsdFxuICovXG5leHBvcnQgZnVuY3Rpb24gdmFsaWRhdGVGaWxlUGF0aChmaWxlUGF0aCkge1xuXHRpZiAoIWZpbGVQYXRoKSB7XG5cdFx0cmV0dXJuIHsgaXNWYWxpZDogZmFsc2UsIGVycm9yOiAnTWlzc2luZyBmaWxlUGF0aCcgfTtcblx0fVxuXG5cdGNvbnN0IGFic29sdXRlRmlsZVBhdGggPSBwYXRoLnJlc29sdmUoVklURV9QUk9KRUNUX1JPT1QsIGZpbGVQYXRoKTtcblxuXHRpZiAoZmlsZVBhdGguaW5jbHVkZXMoJy4uJylcblx0XHR8fCAhYWJzb2x1dGVGaWxlUGF0aC5zdGFydHNXaXRoKFZJVEVfUFJPSkVDVF9ST09UKVxuXHRcdHx8IGFic29sdXRlRmlsZVBhdGguaW5jbHVkZXMoJ25vZGVfbW9kdWxlcycpKSB7XG5cdFx0cmV0dXJuIHsgaXNWYWxpZDogZmFsc2UsIGVycm9yOiAnSW52YWxpZCBwYXRoJyB9O1xuXHR9XG5cblx0aWYgKCFmcy5leGlzdHNTeW5jKGFic29sdXRlRmlsZVBhdGgpKSB7XG5cdFx0cmV0dXJuIHsgaXNWYWxpZDogZmFsc2UsIGVycm9yOiAnRmlsZSBub3QgZm91bmQnIH07XG5cdH1cblxuXHRyZXR1cm4geyBpc1ZhbGlkOiB0cnVlLCBhYnNvbHV0ZVBhdGg6IGFic29sdXRlRmlsZVBhdGggfTtcbn1cblxuLyoqXG4gKiBQYXJzZXMgYSBmaWxlIGludG8gYSBCYWJlbCBBU1RcbiAqIEBwYXJhbSB7c3RyaW5nfSBhYnNvbHV0ZUZpbGVQYXRoIC0gQWJzb2x1dGUgcGF0aCB0byBmaWxlXG4gKiBAcmV0dXJucyB7b2JqZWN0fSBCYWJlbCBBU1RcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlRmlsZVRvQVNUKGFic29sdXRlRmlsZVBhdGgpIHtcblx0Y29uc3QgY29udGVudCA9IGZzLnJlYWRGaWxlU3luYyhhYnNvbHV0ZUZpbGVQYXRoLCAndXRmLTgnKTtcblxuXHRyZXR1cm4gcGFyc2UoY29udGVudCwge1xuXHRcdHNvdXJjZVR5cGU6ICdtb2R1bGUnLFxuXHRcdHBsdWdpbnM6IFsnanN4JywgJ3R5cGVzY3JpcHQnXSxcblx0XHRlcnJvclJlY292ZXJ5OiB0cnVlLFxuXHR9KTtcbn1cblxuLyoqXG4gKiBGaW5kcyBhIEpTWCBvcGVuaW5nIGVsZW1lbnQgYXQgYSBzcGVjaWZpYyBsaW5lIGFuZCBjb2x1bW5cbiAqIEBwYXJhbSB7b2JqZWN0fSBhc3QgLSBCYWJlbCBBU1RcbiAqIEBwYXJhbSB7bnVtYmVyfSBsaW5lIC0gTGluZSBudW1iZXIgKDEtaW5kZXhlZClcbiAqIEBwYXJhbSB7bnVtYmVyfSBjb2x1bW4gLSBDb2x1bW4gbnVtYmVyICgwLWluZGV4ZWQgZm9yIGdldC1jb2RlLWJsb2NrLCAxLWluZGV4ZWQgZm9yIGFwcGx5LWVkaXQpXG4gKiBAcmV0dXJucyB7b2JqZWN0IHwgbnVsbH0gQmFiZWwgcGF0aCB0byB0aGUgSlNYIG9wZW5pbmcgZWxlbWVudFxuICovXG5leHBvcnQgZnVuY3Rpb24gZmluZEpTWEVsZW1lbnRBdFBvc2l0aW9uKGFzdCwgbGluZSwgY29sdW1uKSB7XG5cdGxldCB0YXJnZXROb2RlUGF0aCA9IG51bGw7XG5cdGxldCBjbG9zZXN0Tm9kZVBhdGggPSBudWxsO1xuXHRsZXQgY2xvc2VzdERpc3RhbmNlID0gSW5maW5pdHk7XG5cdGNvbnN0IGFsbE5vZGVzT25MaW5lID0gW107XG5cblx0Y29uc3QgdmlzaXRvciA9IHtcblx0XHRKU1hPcGVuaW5nRWxlbWVudChwYXRoKSB7XG5cdFx0XHRjb25zdCBub2RlID0gcGF0aC5ub2RlO1xuXHRcdFx0aWYgKG5vZGUubG9jKSB7XG5cdFx0XHRcdC8vIEV4YWN0IG1hdGNoICh3aXRoIHRvbGVyYW5jZSBmb3Igb2ZmLWJ5LW9uZSBjb2x1bW4gZGlmZmVyZW5jZXMpXG5cdFx0XHRcdGlmIChub2RlLmxvYy5zdGFydC5saW5lID09PSBsaW5lXG5cdFx0XHRcdFx0JiYgTWF0aC5hYnMobm9kZS5sb2Muc3RhcnQuY29sdW1uIC0gY29sdW1uKSA8PSAxKSB7XG5cdFx0XHRcdFx0dGFyZ2V0Tm9kZVBhdGggPSBwYXRoO1xuXHRcdFx0XHRcdHBhdGguc3RvcCgpO1xuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vIFRyYWNrIGFsbCBub2RlcyBvbiB0aGUgc2FtZSBsaW5lXG5cdFx0XHRcdGlmIChub2RlLmxvYy5zdGFydC5saW5lID09PSBsaW5lKSB7XG5cdFx0XHRcdFx0YWxsTm9kZXNPbkxpbmUucHVzaCh7XG5cdFx0XHRcdFx0XHRwYXRoLFxuXHRcdFx0XHRcdFx0Y29sdW1uOiBub2RlLmxvYy5zdGFydC5jb2x1bW4sXG5cdFx0XHRcdFx0XHRkaXN0YW5jZTogTWF0aC5hYnMobm9kZS5sb2Muc3RhcnQuY29sdW1uIC0gY29sdW1uKSxcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vIFRyYWNrIGNsb3Nlc3QgbWF0Y2ggb24gdGhlIHNhbWUgbGluZSBmb3IgZmFsbGJhY2tcblx0XHRcdFx0aWYgKG5vZGUubG9jLnN0YXJ0LmxpbmUgPT09IGxpbmUpIHtcblx0XHRcdFx0XHRjb25zdCBkaXN0YW5jZSA9IE1hdGguYWJzKG5vZGUubG9jLnN0YXJ0LmNvbHVtbiAtIGNvbHVtbik7XG5cdFx0XHRcdFx0aWYgKGRpc3RhbmNlIDwgY2xvc2VzdERpc3RhbmNlKSB7XG5cdFx0XHRcdFx0XHRjbG9zZXN0RGlzdGFuY2UgPSBkaXN0YW5jZTtcblx0XHRcdFx0XHRcdGNsb3Nlc3ROb2RlUGF0aCA9IHBhdGg7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSxcblx0XHQvLyBBbHNvIGNoZWNrIEpTWEVsZW1lbnQgbm9kZXMgdGhhdCBjb250YWluIHRoZSBwb3NpdGlvblxuXHRcdEpTWEVsZW1lbnQocGF0aCkge1xuXHRcdFx0Y29uc3Qgbm9kZSA9IHBhdGgubm9kZTtcblx0XHRcdGlmICghbm9kZS5sb2MpIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBDaGVjayBpZiB0aGlzIGVsZW1lbnQgc3BhbnMgdGhlIHRhcmdldCBsaW5lIChmb3IgbXVsdGktbGluZSBlbGVtZW50cylcblx0XHRcdGlmIChub2RlLmxvYy5zdGFydC5saW5lID4gbGluZSB8fCBub2RlLmxvYy5lbmQubGluZSA8IGxpbmUpIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBJZiB3ZSdyZSBpbnNpZGUgdGhpcyBlbGVtZW50J3MgcmFuZ2UsIGNvbnNpZGVyIGl0cyBvcGVuaW5nIGVsZW1lbnRcblx0XHRcdGlmICghcGF0aC5ub2RlLm9wZW5pbmdFbGVtZW50Py5sb2MpIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHRjb25zdCBvcGVuaW5nTGluZSA9IHBhdGgubm9kZS5vcGVuaW5nRWxlbWVudC5sb2Muc3RhcnQubGluZTtcblx0XHRcdGNvbnN0IG9wZW5pbmdDb2wgPSBwYXRoLm5vZGUub3BlbmluZ0VsZW1lbnQubG9jLnN0YXJ0LmNvbHVtbjtcblxuXHRcdFx0Ly8gUHJlZmVyIGVsZW1lbnRzIHRoYXQgc3RhcnQgb24gdGhlIGV4YWN0IGxpbmVcblx0XHRcdGlmIChvcGVuaW5nTGluZSA9PT0gbGluZSkge1xuXHRcdFx0XHRjb25zdCBkaXN0YW5jZSA9IE1hdGguYWJzKG9wZW5pbmdDb2wgLSBjb2x1bW4pO1xuXHRcdFx0XHRpZiAoZGlzdGFuY2UgPCBjbG9zZXN0RGlzdGFuY2UpIHtcblx0XHRcdFx0XHRjbG9zZXN0RGlzdGFuY2UgPSBkaXN0YW5jZTtcblx0XHRcdFx0XHRjbG9zZXN0Tm9kZVBhdGggPSBwYXRoLmdldCgnb3BlbmluZ0VsZW1lbnQnKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdC8vIEhhbmRsZSBlbGVtZW50cyB0aGF0IHN0YXJ0IGJlZm9yZSB0aGUgdGFyZ2V0IGxpbmVcblx0XHRcdGlmIChvcGVuaW5nTGluZSA8IGxpbmUpIHtcblx0XHRcdFx0Y29uc3QgZGlzdGFuY2UgPSAobGluZSAtIG9wZW5pbmdMaW5lKSAqIDEwMDsgLy8gUGVuYWxpemUgYnkgbGluZSBkaXN0YW5jZVxuXHRcdFx0XHRpZiAoZGlzdGFuY2UgPCBjbG9zZXN0RGlzdGFuY2UpIHtcblx0XHRcdFx0XHRjbG9zZXN0RGlzdGFuY2UgPSBkaXN0YW5jZTtcblx0XHRcdFx0XHRjbG9zZXN0Tm9kZVBhdGggPSBwYXRoLmdldCgnb3BlbmluZ0VsZW1lbnQnKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0sXG5cdH07XG5cblx0dHJhdmVyc2VCYWJlbC5kZWZhdWx0KGFzdCwgdmlzaXRvcik7XG5cblx0Ly8gUmV0dXJuIGV4YWN0IG1hdGNoIGlmIGZvdW5kLCBvdGhlcndpc2UgcmV0dXJuIGNsb3Nlc3QgbWF0Y2ggaWYgd2l0aGluIHJlYXNvbmFibGUgZGlzdGFuY2Vcblx0Ly8gVXNlIGxhcmdlciB0aHJlc2hvbGQgKDUwIGNoYXJzKSBmb3Igc2FtZS1saW5lIGVsZW1lbnRzLCA1IGxpbmVzIGZvciBtdWx0aS1saW5lIGVsZW1lbnRzXG5cdGNvbnN0IHRocmVzaG9sZCA9IGNsb3Nlc3REaXN0YW5jZSA8IDEwMCA/IDUwIDogNTAwO1xuXHRyZXR1cm4gdGFyZ2V0Tm9kZVBhdGggfHwgKGNsb3Nlc3REaXN0YW5jZSA8PSB0aHJlc2hvbGQgPyBjbG9zZXN0Tm9kZVBhdGggOiBudWxsKTtcbn1cblxuLyoqXG4gKiBDaGVja3MgaWYgYSBKU1ggZWxlbWVudCBuYW1lIGlzIGJsYWNrbGlzdGVkXG4gKiBAcGFyYW0ge29iamVjdH0ganN4T3BlbmluZ0VsZW1lbnQgLSBCYWJlbCBKU1ggb3BlbmluZyBlbGVtZW50IG5vZGVcbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIGJsYWNrbGlzdGVkXG4gKi9cbmZ1bmN0aW9uIGlzQmxhY2tsaXN0ZWRDb21wb25lbnQoanN4T3BlbmluZ0VsZW1lbnQpIHtcblx0aWYgKCFqc3hPcGVuaW5nRWxlbWVudCB8fCAhanN4T3BlbmluZ0VsZW1lbnQubmFtZSkge1xuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXG5cdC8vIEhhbmRsZSBKU1hJZGVudGlmaWVyIChlLmcuLCA8SGVsbWV0Pilcblx0aWYgKGlzSlNYSWRlbnRpZmllcihqc3hPcGVuaW5nRWxlbWVudC5uYW1lKSkge1xuXHRcdHJldHVybiBDT01QT05FTlRfQkxBQ0tMSVNULmhhcyhqc3hPcGVuaW5nRWxlbWVudC5uYW1lLm5hbWUpO1xuXHR9XG5cblx0Ly8gSGFuZGxlIEpTWE1lbWJlckV4cHJlc3Npb24gKGUuZy4sIDxSZWFjdC5GcmFnbWVudD4pXG5cdGlmIChpc0pTWE1lbWJlckV4cHJlc3Npb24oanN4T3BlbmluZ0VsZW1lbnQubmFtZSkpIHtcblx0XHRsZXQgY3VycmVudCA9IGpzeE9wZW5pbmdFbGVtZW50Lm5hbWU7XG5cdFx0d2hpbGUgKGlzSlNYTWVtYmVyRXhwcmVzc2lvbihjdXJyZW50KSkge1xuXHRcdFx0Y3VycmVudCA9IGN1cnJlbnQucHJvcGVydHk7XG5cdFx0fVxuXHRcdGlmIChpc0pTWElkZW50aWZpZXIoY3VycmVudCkpIHtcblx0XHRcdHJldHVybiBDT01QT05FTlRfQkxBQ0tMSVNULmhhcyhjdXJyZW50Lm5hbWUpO1xuXHRcdH1cblx0fVxuXG5cdHJldHVybiBmYWxzZTtcbn1cblxuLyoqXG4gKiBHZW5lcmF0ZXMgY29kZSBmcm9tIGFuIEFTVCBub2RlXG4gKiBAcGFyYW0ge29iamVjdH0gbm9kZSAtIEJhYmVsIEFTVCBub2RlXG4gKiBAcGFyYW0ge29iamVjdH0gb3B0aW9ucyAtIEdlbmVyYXRvciBvcHRpb25zXG4gKiBAcmV0dXJucyB7c3RyaW5nfSBHZW5lcmF0ZWQgY29kZVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2VuZXJhdGVDb2RlKG5vZGUsIG9wdGlvbnMgPSB7fSkge1xuXHRjb25zdCBnZW5lcmF0ZUZ1bmN0aW9uID0gZ2VuZXJhdGUuZGVmYXVsdCB8fCBnZW5lcmF0ZTtcblx0Y29uc3Qgb3V0cHV0ID0gZ2VuZXJhdGVGdW5jdGlvbihub2RlLCBvcHRpb25zKTtcblx0cmV0dXJuIG91dHB1dC5jb2RlO1xufVxuXG4vKipcbiAqIEdlbmVyYXRlcyBhIGZ1bGwgc291cmNlIGZpbGUgZnJvbSBBU1Qgd2l0aCBzb3VyY2UgbWFwc1xuICogQHBhcmFtIHtvYmplY3R9IGFzdCAtIEJhYmVsIEFTVFxuICogQHBhcmFtIHtzdHJpbmd9IHNvdXJjZUZpbGVOYW1lIC0gU291cmNlIGZpbGUgbmFtZSBmb3Igc291cmNlIG1hcFxuICogQHBhcmFtIHtzdHJpbmd9IG9yaWdpbmFsQ29kZSAtIE9yaWdpbmFsIHNvdXJjZSBjb2RlXG4gKiBAcmV0dXJucyB7e2NvZGU6IHN0cmluZywgbWFwOiBvYmplY3R9fSAtIE9iamVjdCBjb250YWluaW5nIGdlbmVyYXRlZCBjb2RlIGFuZCBzb3VyY2UgbWFwXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZW5lcmF0ZVNvdXJjZVdpdGhNYXAoYXN0LCBzb3VyY2VGaWxlTmFtZSwgb3JpZ2luYWxDb2RlKSB7XG5cdGNvbnN0IGdlbmVyYXRlRnVuY3Rpb24gPSBnZW5lcmF0ZS5kZWZhdWx0IHx8IGdlbmVyYXRlO1xuXHRyZXR1cm4gZ2VuZXJhdGVGdW5jdGlvbihhc3QsIHtcblx0XHRzb3VyY2VNYXBzOiB0cnVlLFxuXHRcdHNvdXJjZUZpbGVOYW1lLFxuXHR9LCBvcmlnaW5hbENvZGUpO1xufVxuXG4vKipcbiAqIEV4dHJhY3RzIGNvZGUgYmxvY2tzIGZyb20gYSBKU1ggZWxlbWVudCBhdCBhIHNwZWNpZmljIGxvY2F0aW9uXG4gKiBAcGFyYW0ge3N0cmluZ30gZmlsZVBhdGggLSBSZWxhdGl2ZSBmaWxlIHBhdGhcbiAqIEBwYXJhbSB7bnVtYmVyfSBsaW5lIC0gTGluZSBudW1iZXJcbiAqIEBwYXJhbSB7bnVtYmVyfSBjb2x1bW4gLSBDb2x1bW4gbnVtYmVyXG4gKiBAcGFyYW0ge29iamVjdH0gW2RvbUNvbnRleHRdIC0gT3B0aW9uYWwgRE9NIGNvbnRleHQgdG8gcmV0dXJuIG9uIGZhaWx1cmVcbiAqIEByZXR1cm5zIHt7c3VjY2VzczogYm9vbGVhbiwgZmlsZVBhdGg/OiBzdHJpbmcsIHNwZWNpZmljTGluZT86IHN0cmluZywgZXJyb3I/OiBzdHJpbmcsIGRvbUNvbnRleHQ/OiBvYmplY3R9fSAtIE9iamVjdCB3aXRoIG1ldGFkYXRhIGZvciBMTE1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGV4dHJhY3RDb2RlQmxvY2tzKGZpbGVQYXRoLCBsaW5lLCBjb2x1bW4sIGRvbUNvbnRleHQpIHtcblx0dHJ5IHtcblx0XHQvLyBWYWxpZGF0ZSBmaWxlIHBhdGhcblx0XHRjb25zdCB2YWxpZGF0aW9uID0gdmFsaWRhdGVGaWxlUGF0aChmaWxlUGF0aCk7XG5cdFx0aWYgKCF2YWxpZGF0aW9uLmlzVmFsaWQpIHtcblx0XHRcdHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogdmFsaWRhdGlvbi5lcnJvciwgZG9tQ29udGV4dCB9O1xuXHRcdH1cblxuXHRcdC8vIFBhcnNlIEFTVFxuXHRcdGNvbnN0IGFzdCA9IHBhcnNlRmlsZVRvQVNUKHZhbGlkYXRpb24uYWJzb2x1dGVQYXRoKTtcblxuXHRcdC8vIEZpbmQgdGFyZ2V0IG5vZGVcblx0XHRjb25zdCB0YXJnZXROb2RlUGF0aCA9IGZpbmRKU1hFbGVtZW50QXRQb3NpdGlvbihhc3QsIGxpbmUsIGNvbHVtbik7XG5cblx0XHRpZiAoIXRhcmdldE5vZGVQYXRoKSB7XG5cdFx0XHRyZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdUYXJnZXQgbm9kZSBub3QgZm91bmQgYXQgc3BlY2lmaWVkIGxpbmUvY29sdW1uJywgZG9tQ29udGV4dCB9O1xuXHRcdH1cblxuXHRcdC8vIENoZWNrIGlmIHRoZSB0YXJnZXQgbm9kZSBpcyBhIGJsYWNrbGlzdGVkIGNvbXBvbmVudFxuXHRcdGNvbnN0IGlzQmxhY2tsaXN0ZWQgPSBpc0JsYWNrbGlzdGVkQ29tcG9uZW50KHRhcmdldE5vZGVQYXRoLm5vZGUpO1xuXG5cdFx0aWYgKGlzQmxhY2tsaXN0ZWQpIHtcblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdHN1Y2Nlc3M6IHRydWUsXG5cdFx0XHRcdGZpbGVQYXRoLFxuXHRcdFx0XHRzcGVjaWZpY0xpbmU6ICcnLFxuXHRcdFx0fTtcblx0XHR9XG5cblx0XHQvLyBHZXQgc3BlY2lmaWMgbGluZSBjb2RlXG5cdFx0Y29uc3Qgc3BlY2lmaWNMaW5lID0gZ2VuZXJhdGVDb2RlKHRhcmdldE5vZGVQYXRoLnBhcmVudFBhdGg/Lm5vZGUgfHwgdGFyZ2V0Tm9kZVBhdGgubm9kZSk7XG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0c3VjY2VzczogdHJ1ZSxcblx0XHRcdGZpbGVQYXRoLFxuXHRcdFx0c3BlY2lmaWNMaW5lLFxuXHRcdH07XG5cdH0gY2F0Y2ggKGVycm9yKSB7XG5cdFx0Y29uc29sZS5lcnJvcignW2FzdC11dGlsc10gRXJyb3IgZXh0cmFjdGluZyBjb2RlIGJsb2NrczonLCBlcnJvcik7XG5cdFx0cmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnRmFpbGVkIHRvIGV4dHJhY3QgY29kZSBibG9ja3MnLCBkb21Db250ZXh0IH07XG5cdH1cbn1cblxuLyoqXG4gKiBQcm9qZWN0IHJvb3QgcGF0aFxuICovXG5leHBvcnQgeyBWSVRFX1BST0pFQ1RfUk9PVCB9O1xuIiwgImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxDb21wdXRpYS5tZVxcXFxEZXNrdG9wXFxcXFNoYXJlZCBEb2NzXFxcXFJlYWR5bmVzdCBXZWJBcHBcXFxccGx1Z2luc1xcXFx2aXN1YWwtZWRpdG9yXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxDb21wdXRpYS5tZVxcXFxEZXNrdG9wXFxcXFNoYXJlZCBEb2NzXFxcXFJlYWR5bmVzdCBXZWJBcHBcXFxccGx1Z2luc1xcXFx2aXN1YWwtZWRpdG9yXFxcXHZpdGUtcGx1Z2luLWVkaXQtbW9kZS5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvQ29tcHV0aWEubWUvRGVza3RvcC9TaGFyZWQlMjBEb2NzL1JlYWR5bmVzdCUyMFdlYkFwcC9wbHVnaW5zL3Zpc3VhbC1lZGl0b3Ivdml0ZS1wbHVnaW4tZWRpdC1tb2RlLmpzXCI7aW1wb3J0IHsgcmVhZEZpbGVTeW5jIH0gZnJvbSAnZnMnO1xuaW1wb3J0IHsgcmVzb2x2ZSB9IGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgZmlsZVVSTFRvUGF0aCB9IGZyb20gJ3VybCc7XG5pbXBvcnQgeyBFRElUX01PREVfU1RZTEVTIH0gZnJvbSAnLi92aXN1YWwtZWRpdG9yLWNvbmZpZyc7XG5cbmNvbnN0IF9fZmlsZW5hbWUgPSBmaWxlVVJMVG9QYXRoKGltcG9ydC5tZXRhLnVybCk7XG5jb25zdCBfX2Rpcm5hbWUgPSByZXNvbHZlKF9fZmlsZW5hbWUsICcuLicpO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBpbmxpbmVFZGl0RGV2UGx1Z2luKCkge1xuXHRyZXR1cm4ge1xuXHRcdG5hbWU6ICd2aXRlOmlubGluZS1lZGl0LWRldicsXG5cdFx0YXBwbHk6ICdzZXJ2ZScsXG5cdFx0dHJhbnNmb3JtSW5kZXhIdG1sKCkge1xuXHRcdFx0Y29uc3Qgc2NyaXB0UGF0aCA9IHJlc29sdmUoX19kaXJuYW1lLCAnZWRpdC1tb2RlLXNjcmlwdC5qcycpO1xuXHRcdFx0Y29uc3Qgc2NyaXB0Q29udGVudCA9IHJlYWRGaWxlU3luYyhzY3JpcHRQYXRoLCAndXRmLTgnKTtcblxuXHRcdFx0cmV0dXJuIFtcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHRhZzogJ3NjcmlwdCcsXG5cdFx0XHRcdFx0YXR0cnM6IHsgdHlwZTogJ21vZHVsZScgfSxcblx0XHRcdFx0XHRjaGlsZHJlbjogc2NyaXB0Q29udGVudCxcblx0XHRcdFx0XHRpbmplY3RUbzogJ2JvZHknXG5cdFx0XHRcdH0sXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0YWc6ICdzdHlsZScsXG5cdFx0XHRcdFx0Y2hpbGRyZW46IEVESVRfTU9ERV9TVFlMRVMsXG5cdFx0XHRcdFx0aW5qZWN0VG86ICdoZWFkJ1xuXHRcdFx0XHR9XG5cdFx0XHRdO1xuXHRcdH1cblx0fTtcbn1cbiIsICJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcQ29tcHV0aWEubWVcXFxcRGVza3RvcFxcXFxTaGFyZWQgRG9jc1xcXFxSZWFkeW5lc3QgV2ViQXBwXFxcXHBsdWdpbnNcXFxcdmlzdWFsLWVkaXRvclwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcQ29tcHV0aWEubWVcXFxcRGVza3RvcFxcXFxTaGFyZWQgRG9jc1xcXFxSZWFkeW5lc3QgV2ViQXBwXFxcXHBsdWdpbnNcXFxcdmlzdWFsLWVkaXRvclxcXFx2aXN1YWwtZWRpdG9yLWNvbmZpZy5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvQ29tcHV0aWEubWUvRGVza3RvcC9TaGFyZWQlMjBEb2NzL1JlYWR5bmVzdCUyMFdlYkFwcC9wbHVnaW5zL3Zpc3VhbC1lZGl0b3IvdmlzdWFsLWVkaXRvci1jb25maWcuanNcIjtleHBvcnQgY29uc3QgUE9QVVBfU1RZTEVTID0gYFxuI2lubGluZS1lZGl0b3ItcG9wdXAge1xuXHR3aWR0aDogMzYwcHg7XG5cdHBvc2l0aW9uOiBmaXhlZDtcblx0ei1pbmRleDogMTAwMDA7XG5cdGJhY2tncm91bmQ6ICMxNjE3MTg7XG5cdGNvbG9yOiB3aGl0ZTtcblx0Ym9yZGVyOiAxcHggc29saWQgIzRhNTU2ODtcblx0Ym9yZGVyLXJhZGl1czogMTZweDtcblx0cGFkZGluZzogOHB4O1xuXHRib3gtc2hhZG93OiAwIDRweCAxMnB4IHJnYmEoMCwwLDAsMC4yKTtcblx0ZmxleC1kaXJlY3Rpb246IGNvbHVtbjtcblx0Z2FwOiAxMHB4O1xuXHRkaXNwbGF5OiBub25lO1xufVxuXG5AbWVkaWEgKG1heC13aWR0aDogNzY4cHgpIHtcblx0I2lubGluZS1lZGl0b3ItcG9wdXAge1xuXHRcdHdpZHRoOiBjYWxjKDEwMCUgLSAyMHB4KTtcblx0fVxufVxuXG4jaW5saW5lLWVkaXRvci1wb3B1cC5pcy1hY3RpdmUge1xuXHRkaXNwbGF5OiBmbGV4O1xuXHR0b3A6IDUwJTtcblx0bGVmdDogNTAlO1xuXHR0cmFuc2Zvcm06IHRyYW5zbGF0ZSgtNTAlLCAtNTAlKTtcbn1cblxuI2lubGluZS1lZGl0b3ItcG9wdXAuaXMtZGlzYWJsZWQtdmlldyB7XG5cdHBhZGRpbmc6IDEwcHggMTVweDtcbn1cblxuI2lubGluZS1lZGl0b3ItcG9wdXAgdGV4dGFyZWEge1xuXHRoZWlnaHQ6IDEwMHB4O1xuXHRwYWRkaW5nOiA0cHggOHB4O1xuXHRiYWNrZ3JvdW5kOiB0cmFuc3BhcmVudDtcblx0Y29sb3I6IHdoaXRlO1xuXHRmb250LWZhbWlseTogaW5oZXJpdDtcblx0Zm9udC1zaXplOiAwLjg3NXJlbTtcblx0bGluZS1oZWlnaHQ6IDEuNDI7XG5cdHJlc2l6ZTogbm9uZTtcblx0b3V0bGluZTogbm9uZTtcbn1cblxuI2lubGluZS1lZGl0b3ItcG9wdXAgLmJ1dHRvbi1jb250YWluZXIge1xuXHRkaXNwbGF5OiBmbGV4O1xuXHRqdXN0aWZ5LWNvbnRlbnQ6IGZsZXgtZW5kO1xuXHRnYXA6IDEwcHg7XG59XG5cbiNpbmxpbmUtZWRpdG9yLXBvcHVwIC5wb3B1cC1idXR0b24ge1xuXHRib3JkZXI6IG5vbmU7XG5cdHBhZGRpbmc6IDZweCAxNnB4O1xuXHRib3JkZXItcmFkaXVzOiA4cHg7XG5cdGN1cnNvcjogcG9pbnRlcjtcblx0Zm9udC1zaXplOiAwLjc1cmVtO1xuXHRmb250LXdlaWdodDogNzAwO1xuXHRoZWlnaHQ6IDM0cHg7XG5cdG91dGxpbmU6IG5vbmU7XG59XG5cbiNpbmxpbmUtZWRpdG9yLXBvcHVwIC5zYXZlLWJ1dHRvbiB7XG5cdGJhY2tncm91bmQ6ICM2NzNkZTY7XG5cdGNvbG9yOiB3aGl0ZTtcbn1cblxuI2lubGluZS1lZGl0b3ItcG9wdXAgLmNhbmNlbC1idXR0b24ge1xuXHRiYWNrZ3JvdW5kOiB0cmFuc3BhcmVudDtcblx0Ym9yZGVyOiAxcHggc29saWQgIzNiM2Q0YTtcblx0Y29sb3I6IHdoaXRlO1xuXG5cdCY6aG92ZXIge1xuXHRiYWNrZ3JvdW5kOiM0NzQ5NTg7XG5cdH1cbn1cbmA7XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRQb3B1cEhUTUxUZW1wbGF0ZShzYXZlTGFiZWwsIGNhbmNlbExhYmVsKSB7XG5cdHJldHVybiBgXG5cdDx0ZXh0YXJlYT48L3RleHRhcmVhPlxuXHQ8ZGl2IGNsYXNzPVwiYnV0dG9uLWNvbnRhaW5lclwiPlxuXHRcdDxidXR0b24gY2xhc3M9XCJwb3B1cC1idXR0b24gY2FuY2VsLWJ1dHRvblwiPiR7Y2FuY2VsTGFiZWx9PC9idXR0b24+XG5cdFx0PGJ1dHRvbiBjbGFzcz1cInBvcHVwLWJ1dHRvbiBzYXZlLWJ1dHRvblwiPiR7c2F2ZUxhYmVsfTwvYnV0dG9uPlxuXHQ8L2Rpdj5cblx0YDtcbn1cblxuZXhwb3J0IGNvbnN0IEVESVRfTU9ERV9TVFlMRVMgPSBgXG5cdCNyb290W2RhdGEtZWRpdC1tb2RlLWVuYWJsZWQ9XCJ0cnVlXCJdIFtkYXRhLWVkaXQtaWRdIHtcblx0XHRjdXJzb3I6IHBvaW50ZXI7IFxuXHRcdG91dGxpbmU6IDJweCBkYXNoZWQgIzM1N0RGOTsgXG5cdFx0b3V0bGluZS1vZmZzZXQ6IDJweDtcblx0XHRtaW4taGVpZ2h0OiAxZW07XG5cdH1cblx0I3Jvb3RbZGF0YS1lZGl0LW1vZGUtZW5hYmxlZD1cInRydWVcIl0gaW1nW2RhdGEtZWRpdC1pZF0ge1xuXHRcdG91dGxpbmUtb2Zmc2V0OiAtMnB4O1xuXHR9XG5cdCNyb290W2RhdGEtZWRpdC1tb2RlLWVuYWJsZWQ9XCJ0cnVlXCJdIHtcblx0XHRjdXJzb3I6IHBvaW50ZXI7XG5cdH1cblx0I3Jvb3RbZGF0YS1lZGl0LW1vZGUtZW5hYmxlZD1cInRydWVcIl0gW2RhdGEtZWRpdC1pZF06aG92ZXIge1xuXHRcdGJhY2tncm91bmQtY29sb3I6ICMzNTdERjkzMztcblx0XHRvdXRsaW5lLWNvbG9yOiAjMzU3REY5OyBcblx0fVxuXG5cdEBrZXlmcmFtZXMgZmFkZUluVG9vbHRpcCB7XG5cdFx0ZnJvbSB7XG5cdFx0XHRvcGFjaXR5OiAwO1xuXHRcdFx0dHJhbnNmb3JtOiB0cmFuc2xhdGVZKDVweCk7XG5cdFx0fVxuXHRcdHRvIHtcblx0XHRcdG9wYWNpdHk6IDE7XG5cdFx0XHR0cmFuc2Zvcm06IHRyYW5zbGF0ZVkoMCk7XG5cdFx0fVxuXHR9XG5cblx0I2lubGluZS1lZGl0b3ItZGlzYWJsZWQtdG9vbHRpcCB7XG5cdFx0ZGlzcGxheTogbm9uZTsgXG5cdFx0b3BhY2l0eTogMDsgXG5cdFx0cG9zaXRpb246IGFic29sdXRlO1xuXHRcdGJhY2tncm91bmQtY29sb3I6ICMxRDFFMjA7XG5cdFx0Y29sb3I6IHdoaXRlO1xuXHRcdHBhZGRpbmc6IDRweCA4cHg7XG5cdFx0Ym9yZGVyLXJhZGl1czogOHB4O1xuXHRcdHotaW5kZXg6IDEwMDAxO1xuXHRcdGZvbnQtc2l6ZTogMTRweDtcblx0XHRib3JkZXI6IDFweCBzb2xpZCAjM0IzRDRBO1xuXHRcdG1heC13aWR0aDogMTg0cHg7XG5cdFx0dGV4dC1hbGlnbjogY2VudGVyO1xuXHR9XG5cblx0I2lubGluZS1lZGl0b3ItZGlzYWJsZWQtdG9vbHRpcC50b29sdGlwLWFjdGl2ZSB7XG5cdFx0ZGlzcGxheTogYmxvY2s7XG5cdFx0YW5pbWF0aW9uOiBmYWRlSW5Ub29sdGlwIDAuMnMgZWFzZS1vdXQgZm9yd2FyZHM7XG5cdH1cbmA7XG4iLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXENvbXB1dGlhLm1lXFxcXERlc2t0b3BcXFxcU2hhcmVkIERvY3NcXFxcUmVhZHluZXN0IFdlYkFwcFxcXFxwbHVnaW5zXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxDb21wdXRpYS5tZVxcXFxEZXNrdG9wXFxcXFNoYXJlZCBEb2NzXFxcXFJlYWR5bmVzdCBXZWJBcHBcXFxccGx1Z2luc1xcXFx2aXRlLXBsdWdpbi1pZnJhbWUtcm91dGUtcmVzdG9yYXRpb24uanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL0NvbXB1dGlhLm1lL0Rlc2t0b3AvU2hhcmVkJTIwRG9jcy9SZWFkeW5lc3QlMjBXZWJBcHAvcGx1Z2lucy92aXRlLXBsdWdpbi1pZnJhbWUtcm91dGUtcmVzdG9yYXRpb24uanNcIjtleHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBpZnJhbWVSb3V0ZVJlc3RvcmF0aW9uUGx1Z2luKCkge1xuICByZXR1cm4ge1xuICAgIG5hbWU6ICd2aXRlOmlmcmFtZS1yb3V0ZS1yZXN0b3JhdGlvbicsXG4gICAgYXBwbHk6ICdzZXJ2ZScsXG4gICAgdHJhbnNmb3JtSW5kZXhIdG1sKCkge1xuICAgICAgY29uc3Qgc2NyaXB0ID0gYFxuICAgICAgY29uc3QgQUxMT1dFRF9QQVJFTlRfT1JJR0lOUyA9IFtcbiAgICAgICAgICBcImh0dHBzOi8vaG9yaXpvbnMuaG9zdGluZ2VyLmNvbVwiLFxuICAgICAgICAgIFwiaHR0cHM6Ly9ob3Jpem9ucy5ob3N0aW5nZXIuZGV2XCIsXG4gICAgICAgICAgXCJodHRwczovL2hvcml6b25zLWZyb250ZW5kLWxvY2FsLmhvc3Rpbmdlci5kZXZcIixcbiAgICAgIF07XG5cbiAgICAgICAgLy8gQ2hlY2sgdG8gc2VlIGlmIHRoZSBwYWdlIGlzIGluIGFuIGlmcmFtZVxuICAgICAgICBpZiAod2luZG93LnNlbGYgIT09IHdpbmRvdy50b3ApIHtcbiAgICAgICAgICBjb25zdCBTVE9SQUdFX0tFWSA9ICdob3Jpem9ucy1pZnJhbWUtc2F2ZWQtcm91dGUnO1xuXG4gICAgICAgICAgY29uc3QgZ2V0Q3VycmVudFJvdXRlID0gKCkgPT4gbG9jYXRpb24ucGF0aG5hbWUgKyBsb2NhdGlvbi5zZWFyY2ggKyBsb2NhdGlvbi5oYXNoO1xuXG4gICAgICAgICAgY29uc3Qgc2F2ZSA9ICgpID0+IHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRSb3V0ZSA9IGdldEN1cnJlbnRSb3V0ZSgpO1xuICAgICAgICAgICAgICBzZXNzaW9uU3RvcmFnZS5zZXRJdGVtKFNUT1JBR0VfS0VZLCBjdXJyZW50Um91dGUpO1xuICAgICAgICAgICAgICB3aW5kb3cucGFyZW50LnBvc3RNZXNzYWdlKHttZXNzYWdlOiAncm91dGUtY2hhbmdlZCcsIHJvdXRlOiBjdXJyZW50Um91dGV9LCAnKicpO1xuICAgICAgICAgICAgfSBjYXRjaCB7fVxuICAgICAgICAgIH07XG5cbiAgICAgICAgICBjb25zdCByZXBsYWNlSGlzdG9yeVN0YXRlID0gKHVybCkgPT4ge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgaGlzdG9yeS5yZXBsYWNlU3RhdGUobnVsbCwgJycsIHVybCk7XG4gICAgICAgICAgICAgIHdpbmRvdy5kaXNwYXRjaEV2ZW50KG5ldyBQb3BTdGF0ZUV2ZW50KCdwb3BzdGF0ZScsIHsgc3RhdGU6IGhpc3Rvcnkuc3RhdGUgfSkpO1xuICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH0gY2F0Y2gge31cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICB9O1xuXG4gICAgICAgICAgY29uc3QgcmVzdG9yZSA9ICgpID0+IHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgIGNvbnN0IHNhdmVkID0gc2Vzc2lvblN0b3JhZ2UuZ2V0SXRlbShTVE9SQUdFX0tFWSk7XG4gICAgICAgICAgICAgIGlmICghc2F2ZWQpIHJldHVybjtcblxuICAgICAgICAgICAgICBpZiAoIXNhdmVkLnN0YXJ0c1dpdGgoJy8nKSkge1xuICAgICAgICAgICAgICAgIHNlc3Npb25TdG9yYWdlLnJlbW92ZUl0ZW0oU1RPUkFHRV9LRVkpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIGNvbnN0IGN1cnJlbnQgPSBnZXRDdXJyZW50Um91dGUoKTtcbiAgICAgICAgICAgICAgaWYgKGN1cnJlbnQgIT09IHNhdmVkKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFyZXBsYWNlSGlzdG9yeVN0YXRlKHNhdmVkKSkge1xuICAgICAgICAgICAgICAgICAgcmVwbGFjZUhpc3RvcnlTdGF0ZSgnLycpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRleHQgPSAoZG9jdW1lbnQuYm9keT8uaW5uZXJUZXh0IHx8ICcnKS50cmltKCk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gSWYgdGhlIHJlc3RvcmVkIHJvdXRlIHJlc3VsdHMgaW4gdG9vIGxpdHRsZSBjb250ZW50LCBhc3N1bWUgaXQgaXMgaW52YWxpZCBhbmQgbmF2aWdhdGUgaG9tZVxuICAgICAgICAgICAgICAgICAgICBpZiAodGV4dC5sZW5ndGggPCA1MCkge1xuICAgICAgICAgICAgICAgICAgICAgIHJlcGxhY2VIaXN0b3J5U3RhdGUoJy8nKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgfSBjYXRjaCB7fVxuICAgICAgICAgICAgICAgIH0sIDEwMDApKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBjYXRjaCB7fVxuICAgICAgICAgIH07XG5cbiAgICAgICAgICBjb25zdCBvcmlnaW5hbFB1c2hTdGF0ZSA9IGhpc3RvcnkucHVzaFN0YXRlO1xuICAgICAgICAgIGhpc3RvcnkucHVzaFN0YXRlID0gZnVuY3Rpb24oLi4uYXJncykge1xuICAgICAgICAgICAgb3JpZ2luYWxQdXNoU3RhdGUuYXBwbHkodGhpcywgYXJncyk7XG4gICAgICAgICAgICBzYXZlKCk7XG4gICAgICAgICAgfTtcblxuICAgICAgICAgIGNvbnN0IG9yaWdpbmFsUmVwbGFjZVN0YXRlID0gaGlzdG9yeS5yZXBsYWNlU3RhdGU7XG4gICAgICAgICAgaGlzdG9yeS5yZXBsYWNlU3RhdGUgPSBmdW5jdGlvbiguLi5hcmdzKSB7XG4gICAgICAgICAgICBvcmlnaW5hbFJlcGxhY2VTdGF0ZS5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICAgICAgICAgIHNhdmUoKTtcbiAgICAgICAgICB9O1xuXG4gICAgICAgICAgY29uc3QgZ2V0UGFyZW50T3JpZ2luID0gKCkgPT4ge1xuICAgICAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24uYW5jZXN0b3JPcmlnaW5zICYmXG4gICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24uYW5jZXN0b3JPcmlnaW5zLmxlbmd0aCA+IDBcbiAgICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gd2luZG93LmxvY2F0aW9uLmFuY2VzdG9yT3JpZ2luc1swXTtcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIGlmIChkb2N1bWVudC5yZWZlcnJlcikge1xuICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmV3IFVSTChkb2N1bWVudC5yZWZlcnJlcikub3JpZ2luO1xuICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihcIkludmFsaWQgcmVmZXJyZXIgVVJMOlwiLCBkb2N1bWVudC5yZWZlcnJlcik7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICB9O1xuXG4gICAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3BvcHN0YXRlJywgc2F2ZSk7XG4gICAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2hhc2hjaGFuZ2UnLCBzYXZlKTtcbiAgICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcIm1lc3NhZ2VcIiwgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICAgIGNvbnN0IHBhcmVudE9yaWdpbiA9IGdldFBhcmVudE9yaWdpbigpO1xuXG4gICAgICAgICAgICAgIGlmIChldmVudC5kYXRhPy50eXBlID09PSBcInJlZGlyZWN0LWhvbWVcIiAmJiBwYXJlbnRPcmlnaW4gJiYgQUxMT1dFRF9QQVJFTlRfT1JJR0lOUy5pbmNsdWRlcyhwYXJlbnRPcmlnaW4pKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgc2F2ZWQgPSBzZXNzaW9uU3RvcmFnZS5nZXRJdGVtKFNUT1JBR0VfS0VZKTtcblxuICAgICAgICAgICAgICAgIGlmKHNhdmVkICYmIHNhdmVkICE9PSAnLycpIHtcbiAgICAgICAgICAgICAgICAgIHJlcGxhY2VIaXN0b3J5U3RhdGUoJy8nKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgcmVzdG9yZSgpO1xuICAgICAgICB9XG4gICAgICBgO1xuXG4gICAgICByZXR1cm4gW1xuICAgICAgICB7XG4gICAgICAgICAgdGFnOiAnc2NyaXB0JyxcbiAgICAgICAgICBhdHRyczogeyB0eXBlOiAnbW9kdWxlJyB9LFxuICAgICAgICAgIGNoaWxkcmVuOiBzY3JpcHQsXG4gICAgICAgICAgaW5qZWN0VG86ICdoZWFkJ1xuICAgICAgICB9XG4gICAgICBdO1xuICAgIH1cbiAgfTtcbn1cbiIsICJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcQ29tcHV0aWEubWVcXFxcRGVza3RvcFxcXFxTaGFyZWQgRG9jc1xcXFxSZWFkeW5lc3QgV2ViQXBwXFxcXHBsdWdpbnNcXFxcc2VsZWN0aW9uLW1vZGVcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXENvbXB1dGlhLm1lXFxcXERlc2t0b3BcXFxcU2hhcmVkIERvY3NcXFxcUmVhZHluZXN0IFdlYkFwcFxcXFxwbHVnaW5zXFxcXHNlbGVjdGlvbi1tb2RlXFxcXHZpdGUtcGx1Z2luLXNlbGVjdGlvbi1tb2RlLmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy9Db21wdXRpYS5tZS9EZXNrdG9wL1NoYXJlZCUyMERvY3MvUmVhZHluZXN0JTIwV2ViQXBwL3BsdWdpbnMvc2VsZWN0aW9uLW1vZGUvdml0ZS1wbHVnaW4tc2VsZWN0aW9uLW1vZGUuanNcIjtpbXBvcnQgeyByZWFkRmlsZVN5bmMgfSBmcm9tICdub2RlOmZzJztcbmltcG9ydCB7IHJlc29sdmUgfSBmcm9tICdub2RlOnBhdGgnO1xuaW1wb3J0IHsgZmlsZVVSTFRvUGF0aCB9IGZyb20gJ25vZGU6dXJsJztcblxuY29uc3QgX19maWxlbmFtZSA9IGZpbGVVUkxUb1BhdGgoaW1wb3J0Lm1ldGEudXJsKTtcbmNvbnN0IF9fZGlybmFtZSA9IHJlc29sdmUoX19maWxlbmFtZSwgJy4uJyk7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIHNlbGVjdGlvbk1vZGVQbHVnaW4oKSB7XG5cdHJldHVybiB7XG5cdFx0bmFtZTogJ3ZpdGU6c2VsZWN0aW9uLW1vZGUnLFxuXHRcdGFwcGx5OiAnc2VydmUnLFxuXG5cdFx0dHJhbnNmb3JtSW5kZXhIdG1sKCkge1xuXHRcdFx0Y29uc3Qgc2NyaXB0UGF0aCA9IHJlc29sdmUoX19kaXJuYW1lLCAnc2VsZWN0aW9uLW1vZGUtc2NyaXB0LmpzJyk7XG5cdFx0XHRjb25zdCBzY3JpcHRDb250ZW50ID0gcmVhZEZpbGVTeW5jKHNjcmlwdFBhdGgsICd1dGYtOCcpO1xuXG5cdFx0XHRyZXR1cm4gW1xuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dGFnOiAnc2NyaXB0Jyxcblx0XHRcdFx0XHRhdHRyczogeyB0eXBlOiAnbW9kdWxlJyB9LFxuXHRcdFx0XHRcdGNoaWxkcmVuOiBzY3JpcHRDb250ZW50LFxuXHRcdFx0XHRcdGluamVjdFRvOiAnYm9keScsXG5cdFx0XHRcdH0sXG5cdFx0XHRdO1xuXHRcdH0sXG5cdH07XG59XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQTZXLE9BQU9BLFdBQVU7QUFDOVgsT0FBTyxXQUFXO0FBQ2xCLFNBQVMsY0FBYyxvQkFBb0I7OztBQ0ZnYixPQUFPQyxXQUFVO0FBQzVlLFNBQVMsU0FBQUMsY0FBYTtBQUN0QixPQUFPQyxvQkFBbUI7QUFDMUIsWUFBWSxPQUFPO0FBQ25CLE9BQU9DLFNBQVE7OztBQ0p3WSxPQUFPLFFBQVE7QUFDdGEsT0FBTyxVQUFVO0FBQ2pCLFNBQVMscUJBQXFCO0FBQzlCLE9BQU8sY0FBYztBQUNyQixTQUFTLGFBQWE7QUFDdEIsT0FBTyxtQkFBbUI7QUFDMUI7QUFBQSxFQUNDO0FBQUEsRUFDQTtBQUFBLE9BQ007QUFUNFAsSUFBTSwyQ0FBMkM7QUFXcFQsSUFBTSxhQUFhLGNBQWMsd0NBQWU7QUFDaEQsSUFBTUMsYUFBWSxLQUFLLFFBQVEsVUFBVTtBQUN6QyxJQUFNLG9CQUFvQixLQUFLLFFBQVFBLFlBQVcsT0FBTztBQTJCbEQsU0FBUyxpQkFBaUIsVUFBVTtBQUMxQyxNQUFJLENBQUMsVUFBVTtBQUNkLFdBQU8sRUFBRSxTQUFTLE9BQU8sT0FBTyxtQkFBbUI7QUFBQSxFQUNwRDtBQUVBLFFBQU0sbUJBQW1CLEtBQUssUUFBUSxtQkFBbUIsUUFBUTtBQUVqRSxNQUFJLFNBQVMsU0FBUyxJQUFJLEtBQ3RCLENBQUMsaUJBQWlCLFdBQVcsaUJBQWlCLEtBQzlDLGlCQUFpQixTQUFTLGNBQWMsR0FBRztBQUM5QyxXQUFPLEVBQUUsU0FBUyxPQUFPLE9BQU8sZUFBZTtBQUFBLEVBQ2hEO0FBRUEsTUFBSSxDQUFDLEdBQUcsV0FBVyxnQkFBZ0IsR0FBRztBQUNyQyxXQUFPLEVBQUUsU0FBUyxPQUFPLE9BQU8saUJBQWlCO0FBQUEsRUFDbEQ7QUFFQSxTQUFPLEVBQUUsU0FBUyxNQUFNLGNBQWMsaUJBQWlCO0FBQ3hEO0FBT08sU0FB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QUEsSUFDQSxjQUFjO0FBQUEsRUFDZjtBQUFBLEVBQ0EsU0FBUztBQUFBLElBQ1IsWUFBWSxDQUFDLFFBQVEsT0FBTyxRQUFRLE9BQU8sT0FBUztBQUFBLElBQ3BELE9BQU87QUFBQSxNQUNOLEtBQUtDLE1BQUssUUFBUSxrQ0FBVyxPQUFPO0FBQUEsSUFDckM7QUFBQSxFQUNEO0FBQUEsRUFDQSxPQUFPO0FBQUEsSUFDTixlQUFlO0FBQUEsTUFDZCxVQUFVO0FBQUEsUUFDVDtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLE1BQ0Q7QUFBQSxJQUNEO0FBQUEsRUFDRDtBQUNELENBQUM7IiwKICAibmFtZXMiOiBbInBhdGgiLCAicGF0aCIsICJwYXJzZSIsICJ0cmF2ZXJzZUJhYmVsIiwgImZzIiwgIl9fZGlybmFtZSIsICJwYXRoIiwgInBhdGgiLCAicGFyc2UiLCAidHJhdmVyc2VCYWJlbCIsICJmcyIsICJmaWxlVVJMVG9QYXRoIiwgIl9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwiLCAiX19maWxlbmFtZSIsICJmaWxlVVJMVG9QYXRoIiwgIl9fZGlybmFtZSIsICJyZWFkRmlsZVN5bmMiLCAicmVzb2x2ZSIsICJmaWxlVVJMVG9QYXRoIiwgIl9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwiLCAiX19maWxlbmFtZSIsICJmaWxlVVJMVG9QYXRoIiwgIl9fZGlybmFtZSIsICJyZXNvbHZlIiwgInJlYWRGaWxlU3luYyIsICJwYXRoIl0KfQo=
