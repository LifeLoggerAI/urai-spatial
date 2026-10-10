import ts from 'typescript'

// /demo may use its canonical route layout, but the returned content must still
// be the disclosed Replay Film owner rather than a copied or hidden substitute.
export function rendersCanonicalDemoOwner(source) {
  const file = ts.createSourceFile('page.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  if (file.parseDiagnostics.length) return false
  const ownerImport = file.statements.find(statement => ts.isImportDeclaration(statement)
    && ts.isStringLiteral(statement.moduleSpecifier) && statement.moduleSpecifier.text === './replay-film/page')
  const owner = ownerImport?.importClause?.name?.text
  if (!owner) return false
  const page = file.statements.find(statement => ts.isFunctionDeclaration(statement)
    && statement.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.DefaultKeyword))
  const returns = page?.body?.statements.filter(ts.isReturnStatement) || []
  if (returns.length !== 1 || !returns[0].expression) return false
  const unwrap = expression => ts.isParenthesizedExpression(expression) ? unwrap(expression.expression) : expression
  const isOwner = expression => ts.isJsxSelfClosingElement(expression)
    && expression.tagName.getText(file) === owner && expression.attributes.properties.length === 0
  const rendered = unwrap(returns[0].expression)
  if (isOwner(rendered)) return true
  if (!ts.isJsxElement(rendered) || rendered.openingElement.tagName.getText(file) !== 'div') return false
  const attributes = rendered.openingElement.attributes.properties
  if (attributes.length !== 1 || !ts.isJsxAttribute(attributes[0]) || attributes[0].name.getText(file) !== 'className'
    || !attributes[0].initializer || !ts.isStringLiteral(attributes[0].initializer)
    || attributes[0].initializer.text !== 'urai-replay-film-route') return false
  const children = rendered.children.filter(child => !ts.isJsxText(child) || child.text.trim())
  return children.length === 1 && isOwner(children[0])
}
