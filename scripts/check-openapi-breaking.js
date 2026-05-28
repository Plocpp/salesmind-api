#!/usr/bin/env node

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const YAML = require("yaml");

function run(cmd) {
  return execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function safeRun(cmd) {
  try {
    return run(cmd);
  } catch {
    return "";
  }
}

function parseYaml(content, filePath) {
  try {
    return YAML.parse(content);
  } catch (error) {
    throw new Error(`Falha ao parsear YAML em ${filePath}: ${error.message}`);
  }
}

function methodSet(pathItem) {
  const allowed = ["get", "post", "put", "patch", "delete", "options", "head", "trace"];
  return new Set(Object.keys(pathItem || {}).filter((k) => allowed.includes(k)));
}

function compareSpecs(baseSpec, headSpec, filePath) {
  const issues = [];

  const basePaths = baseSpec.paths || {};
  const headPaths = headSpec.paths || {};

  for (const basePath of Object.keys(basePaths)) {
    if (!(basePath in headPaths)) {
      issues.push(`[BREAKING] Path removido em ${filePath}: ${basePath}`);
      continue;
    }

    const baseMethods = methodSet(basePaths[basePath]);
    const headMethods = methodSet(headPaths[basePath]);

    for (const method of baseMethods) {
      if (!headMethods.has(method)) {
        issues.push(`[BREAKING] Operacao removida em ${filePath}: ${method.toUpperCase()} ${basePath}`);
        continue;
      }

      const baseResponses = (((basePaths[basePath] || {})[method] || {}).responses) || {};
      const headResponses = (((headPaths[basePath] || {})[method] || {}).responses) || {};
      for (const code of Object.keys(baseResponses)) {
        if (!(code in headResponses)) {
          issues.push(`[BREAKING] Response removido em ${filePath}: ${method.toUpperCase()} ${basePath} -> ${code}`);
        }
      }
    }
  }

  return issues;
}

function getChangedContractFiles(baseSha) {
  const diff = safeRun(`git diff --name-only ${baseSha}...HEAD -- contracts/v1/*.openapi.yaml`);
  if (!diff) return [];
  return diff.split("\n").map((f) => f.trim()).filter(Boolean);
}

function readBaseFile(baseSha, filePath) {
  return safeRun(`git show ${baseSha}:${filePath}`);
}

function main() {
  const baseSha = process.env.BASE_SHA;
  if (!baseSha) {
    console.error("BASE_SHA nao informado. Defina BASE_SHA no ambiente para comparar contratos.");
    process.exit(2);
  }

  const changedFiles = getChangedContractFiles(baseSha);
  if (changedFiles.length === 0) {
    console.log("Nenhum contrato OpenAPI alterado para comparar.");
    return;
  }

  const allIssues = [];

  for (const filePath of changedFiles) {
    if (!fs.existsSync(path.resolve(filePath))) {
      continue;
    }

    const baseContent = readBaseFile(baseSha, filePath);
    if (!baseContent) {
      console.log(`Contrato novo detectado (sem base para comparar): ${filePath}`);
      continue;
    }

    const headContent = fs.readFileSync(path.resolve(filePath), "utf8");
    const baseSpec = parseYaml(baseContent, `${filePath} (base)`);
    const headSpec = parseYaml(headContent, `${filePath} (head)`);

    const issues = compareSpecs(baseSpec, headSpec, filePath);
    allIssues.push(...issues);
  }

  if (allIssues.length > 0) {
    console.error("Foram detectadas quebras de contrato OpenAPI:");
    for (const issue of allIssues) {
      console.error(`- ${issue}`);
    }
    process.exit(1);
  }

  console.log("Sem quebras de contrato detectadas nas alteracoes de OpenAPI.");
}

main();
