import * as ts from "./_namespaces/ts.js";
import { defaultKindCache } from "../compiler/kindCache.js";
import { explainKind } from "../compiler/kindExplain.js";

// This file actually uses arguments passed on commandline and executes it

// enable deprecation logging
ts.Debug.loggingHost = {
    log(_level, s) {
        ts.sys.write(`${s || ""}${ts.sys.newLine}`);
    },
};

if (ts.Debug.isDebugging) {
    ts.Debug.enableDebugInfo();
}

if (ts.sys.tryEnableSourceMapsForHost && /^development$/i.test(ts.sys.getEnvironmentVariable("NODE_ENV"))) {
    ts.sys.tryEnableSourceMapsForHost();
}

if (ts.sys.setBlocking) {
    ts.sys.setBlocking();
}

const args = ts.sys.args;
if (args.includes("--kcache-stats")) {
    const s = defaultKindCache.stats();
    ts.sys.write(`[kcache] cacheDir=${s.cacheDir} diskEntries=${s.diskEntries}${ts.sys.newLine}`);
    ts.sys.exit(0);
}
const explainIdx = args.indexOf('--explain-kind');
if (explainIdx >= 0) {
    const mod = args[explainIdx + 1];
    const name = args[explainIdx + 2];
    if (!mod || !name) {
        ts.sys.write(`Usage: --explain-kind <modulePath> <exportName>${ts.sys.newLine}`);
        ts.sys.exit(1);
    }
    const infoMaybe = explainKind(mod, name);
    if (!infoMaybe) {
        ts.sys.write(`No kind info found for ${name} in ${mod}${ts.sys.newLine}`);
        ts.sys.exit(2);
    } else {
        const info = infoMaybe;
        ts.sys.write(`[kind] ${info.exportName} @ ${info.modulePath}${ts.sys.newLine}`);
        ts.sys.write(`  arity: ${info.arity}${ts.sys.newLine}`);
        ts.sys.write(`  variance: [${info.variance.join(', ')}]${ts.sys.newLine}`);
        if (info.roles && info.roles.length) ts.sys.write(`  roles: ${info.roles.join(', ')}${ts.sys.newLine}`);
        if (info.constraints && info.constraints.length) ts.sys.write(`  constraints: ${info.constraints.join(', ')}${ts.sys.newLine}`);
        ts.sys.write(`  key: ${info.symbolKey}${ts.sys.newLine}`);
        ts.sys.write(`  declHash: ${info.hashOfDecl}${ts.sys.newLine}`);
        ts.sys.write(`  precision: ${info.precision}${ts.sys.newLine}`);
        ts.sys.exit(0);
    }
}
ts.executeCommandLine(ts.sys, ts.noop, args);
