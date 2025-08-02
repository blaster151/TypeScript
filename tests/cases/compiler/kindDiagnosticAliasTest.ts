/**
 * Test file for diagnostic code aliasing system
 */

// Test the alias system
import { applyKindDiagnosticAlias, addKindDiagnosticAlias, getAllKindDiagnosticAliases } from "../../../src/compiler/kindDiagnosticAlias.js";

// Test basic functionality
const testCode = 9501;
const aliasedCode = applyKindDiagnosticAlias(testCode);
console.assert(aliasedCode === 9501, "Code without alias should remain unchanged");

// Test adding an alias
addKindDiagnosticAlias(9001, 9501);
const aliasedCode2 = applyKindDiagnosticAlias(9001);
console.assert(aliasedCode2 === 9501, "Code with alias should be mapped");

// Test getting all aliases
const allAliases = getAllKindDiagnosticAliases();
console.assert(allAliases[9001] === 9501, "Alias should be in the map");

console.log("✅ All diagnostic alias tests passed!"); 