import ts from 'typescript'

// Evidence records only actual locale.text/props calls. Comments, private strings,
// comparison operands and unused catalog declarations do not become UI coverage.
export function localizationMessageBindings(source, registeredMessages, filename='consumer.tsx') {
  const file=ts.createSourceFile(filename,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX)
  const ids=new Set()
  function declarationFor(identifier) {
    for(let scope=identifier.parent;scope;scope=scope.parent) {
      if(!ts.isBlock(scope) && !ts.isSourceFile(scope)) continue
      let declaration
      function find(node) {
        if(node!==scope && (ts.isBlock(node) || ts.isFunctionLike(node))) return
        if(ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text===identifier.text) declaration=node
        ts.forEachChild(node,find)
      }
      find(scope)
      if(declaration) {
        if(!(declaration.parent.flags & ts.NodeFlags.Const)) throw new Error(`LOCALIZATION_MUTABLE_MESSAGE_ID:${filename}:${identifier.text}`)
        return declaration.initializer
      }
    }
    return undefined
  }
  function resolve(expression,seen=new Set()) {
    if(!expression) throw new Error(`LOCALIZATION_UNRESOLVED_MESSAGE_ID:${filename}`)
    if(ts.isParenthesizedExpression(expression) || ts.isAsExpression(expression) || ts.isSatisfiesExpression(expression)) return resolve(expression.expression,seen)
    if(ts.isElementAccessExpression(expression) && ts.isIdentifier(expression.expression)) {
      return resolve(declarationFor(expression.expression),seen)
    }
    if(ts.isObjectLiteralExpression(expression)) {
      for(const property of expression.properties) {
        if(!ts.isPropertyAssignment(property)) throw new Error(`LOCALIZATION_UNRESOLVED_MESSAGE_ID:${filename}`)
        resolve(property.initializer,seen)
      }
      return
    }
    if(ts.isStringLiteral(expression)) {
      if(!Object.hasOwn(registeredMessages,expression.text)) throw new Error(`LOCALIZATION_UNREGISTERED_MESSAGE_ID:${filename}:${expression.text}`)
      ids.add(expression.text);return
    }
    if(expression.kind===ts.SyntaxKind.NullKeyword) return
    if(ts.isConditionalExpression(expression)) {resolve(expression.whenTrue,seen);resolve(expression.whenFalse,seen);return}
    if(ts.isIdentifier(expression) && !seen.has(expression.text)) {
      const next=new Set(seen);next.add(expression.text)
      return resolve(declarationFor(expression),next)
    }
    throw new Error(`LOCALIZATION_UNRESOLVED_MESSAGE_ID:${filename}`)
  }
  const hasLocalizedMessageImport=file.statements.some(statement => ts.isImportDeclaration(statement)
    && ts.isStringLiteral(statement.moduleSpecifier) && statement.moduleSpecifier.text.endsWith('/localePreference')
    && statement.importClause?.namedBindings && ts.isNamedImports(statement.importClause.namedBindings)
    && statement.importClause.namedBindings.elements.some(element => element.name.text==='localizedMessage' && (!element.propertyName || element.propertyName.text==='localizedMessage')))
  function visit(node) {
    if(ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)
      && ts.isIdentifier(node.expression.expression) && node.expression.expression.text==='locale'
      && ['text','props'].includes(node.expression.name.text)) resolve(node.arguments[0])
    if(hasLocalizedMessageImport && ts.isCallExpression(node) && ts.isIdentifier(node.expression)
      && node.expression.text==='localizedMessage') resolve(node.arguments[1])
    ts.forEachChild(node,visit)
  }
  visit(file)
  return [...ids].sort()
}
