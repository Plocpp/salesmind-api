#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const YAML = require("yaml");

const contractsDir = path.resolve("contracts", "v1");
const allowedMethods = new Set(["get", "post", "put", "patch", "delete", "options", "head", "trace"]);

function collectOpenApiFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectOpenApiFiles(fullPath));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".openapi.yaml")) {
      files.push(fullPath);
    }
  }

  return files;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function validateOperation(filePath, routePath, method, operation) {
  if (!operation || typeof operation !== "object") {
    return [`${filePath}: operacao invalida em ${method.toUpperCase()} ${routePath}`];
  }

  const errors = [];
  const responses = operation.responses;
  if (!responses || typeof responses !== "object" || Object.keys(responses).length === 0) {
    errors.push(`${filePath}: sem responses em ${method.toUpperCase()} ${routePath}`);
  }

  return errors;
}

function validateFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const spec = YAML.parse(content);
  const errors = [];

  if (!spec || typeof spec !== "object") {
    return [`${filePath}: conteudo OpenAPI invalido`];
  }

  if (!spec.openapi || typeof spec.openapi !== "string") {
    errors.push(`${filePath}: campo 'openapi' ausente`);
  }

  if (!spec.info || typeof spec.info !== "object") {
    errors.push(`${filePath}: objeto 'info' ausente`);
  } else {
    if (!spec.info.title) errors.push(`${filePath}: info.title ausente`);
    if (!spec.info.version) errors.push(`${filePath}: info.version ausente`);
  }

  if (!spec.paths || typeof spec.paths !== "object") {
    errors.push(`${filePath}: objeto 'paths' ausente`);
  } else {
    for (const [routePath, pathItem] of Object.entries(spec.paths)) {
      if (!pathItem || typeof pathItem !== "object") {
        errors.push(`${filePath}: pathItem invalido em ${routePath}`);
        continue;
      }

      const methods = Object.keys(pathItem).filter((m) => allowedMethods.has(m));
      if (methods.length === 0) {
        errors.push(`${filePath}: nenhum metodo HTTP definido em ${routePath}`);
      }

      for (const method of methods) {
        errors.push(...validateOperation(filePath, routePath, method, pathItem[method]));
      }
    }
  }

  return errors;
}

function main() {
  if (!fs.existsSync(contractsDir)) {
    fail("Diretorio de contratos nao encontrado: contracts/v1");
  }

  const files = collectOpenApiFiles(contractsDir).sort();

  if (files.length === 0) {
    fail("Nenhum arquivo .openapi.yaml encontrado em contracts/v1");
  }

  const allErrors = [];
  for (const filePath of files) {
    const relativePath = path.relative(path.resolve("contracts"), filePath).replace(/\\/g, "/");
    console.log(`[contracts:lint] Validando contracts/${relativePath}`);
    allErrors.push(...validateFile(filePath));
  }

  if (allErrors.length > 0) {
    console.error("Falhas encontradas no lint estrutural de contratos:");
    for (const error of allErrors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log("Todos os contratos OpenAPI passaram no lint estrutural.");
}

main();
