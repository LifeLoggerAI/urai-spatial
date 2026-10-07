import ts from 'typescript'

const definitionNames = ['URAI_CORE_MESSAGES', 'URAI_JOURNEY_MESSAGES']
const expected = [
  ['home-semantic-orb', 'button', 'home.orbAction', 'Open URAI Orb companion'],
  ['home-semantic-ground', 'a', 'home.groundAction', 'Open Ground directly'],
  ['home-semantic-life-map', 'a', 'home.lifeMapAction', 'Open Life Map directly'],
]

const unwrap = node => node && (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isSatisfiesExpression(node)) ? unwrap(node.expression) : node
const nameOf = node => ts.isIdentifier(node) || ts.isStringLiteral(node) ? node.text : null
const attribute = (node, name) => node.openingElement.attributes.properties.filter(item => ts.isJsxAttribute(item) && item.name.getText() === name)
const literalAttribute = (node, name) => {
  const found = attribute(node, name)
  return found.length === 1 && found[0].initializer && ts.isStringLiteral(found[0].initializer) ? found[0].initializer.text : null
}
const messageAttribute = (node, name) => {
  const found = attribute(node, name)
  const expression = found.length === 1 && found[0].initializer && ts.isJsxExpression(found[0].initializer) ? unwrap(found[0].initializer.expression) : null
  return expression && ts.isCallExpression(expression) && ts.isPropertyAccessExpression(expression.expression)
    && ts.isIdentifier(expression.expression.expression) && expression.expression.expression.text === 'locale'
    && expression.expression.name.text === 'text' && expression.arguments.length === 1 && ts.isStringLiteral(expression.arguments[0])
    ? expression.arguments[0].text : null
}

// Parse the actual returned JSX and authoritative English definitions. Comments,
// unused strings and detached fake controls do not satisfy this source boundary.
export function homeNavigationSourceFailures(runtimeSource, catalogSources) {
  const failures = []
  const definitions = new Map()
  for (const [index, source] of catalogSources.entries()) {
    const file = ts.createSourceFile(`catalog-${index}.ts`, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
    if (file.parseDiagnostics.length) failures.push('Home navigation catalog has syntax errors')
    for (const statement of file.statements) {
      if (!ts.isVariableStatement(statement) || !(statement.declarationList.flags & ts.NodeFlags.Const)
        || !statement.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword)) continue
      for (const declaration of statement.declarationList.declarations) {
        if (!ts.isIdentifier(declaration.name) || !definitionNames.includes(declaration.name.text)) continue
        const object = unwrap(declaration.initializer)
        if (!object || !ts.isObjectLiteralExpression(object)) { failures.push('Home navigation catalog must use explicit source definitions'); continue }
        for (const entry of object.properties) {
          if (!ts.isPropertyAssignment(entry)) continue
          const id = nameOf(entry.name), value = unwrap(entry.initializer)
          if (!id || !value || !ts.isObjectLiteralExpression(value)) continue
          const sourceFields = value.properties.filter(property => ts.isPropertyAssignment(property) && nameOf(property.name) === 'source')
          const text = sourceFields.length === 1 && ts.isStringLiteral(sourceFields[0].initializer) ? sourceFields[0].initializer.text : null
          if (definitions.has(id)) failures.push(`Duplicate Home navigation message: ${id}`)
          definitions.set(id, text)
        }
      }
    }
  }
  const file = ts.createSourceFile('HomeSpatialRuntimeLayer.tsx', runtimeSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  if (file.parseDiagnostics.length) failures.push('Home navigation runtime has syntax errors')
  const owners = file.statements.filter(node => ts.isFunctionDeclaration(node) && node.name?.text === 'HomeSemanticNavigation')
  const returns = owners.length === 1 ? owners[0].body?.statements.filter(ts.isReturnStatement) ?? [] : []
  const nav = returns.length === 1 ? unwrap(returns[0].expression) : null
  if (!nav || !ts.isJsxElement(nav) || nav.openingElement.tagName.getText() !== 'nav'
    || literalAttribute(nav, 'data-home-navigation-owner') !== 'runtime-boundary'
    || messageAttribute(nav, 'aria-label') !== 'home.destinations'
    || definitions.get('home.destinations') !== 'Accessible Home destinations') {
    failures.push('Home navigation must be the actual returned, named runtime-boundary nav')
    return failures
  }
  const controls = nav.children.filter(ts.isJsxElement)
  for (const [id, tag, key, text] of expected) {
    const targets = controls.filter(node => literalAttribute(node, 'data-testid') === id)
    if (targets.length !== 1 || targets[0].openingElement.tagName.getText() !== tag
      || messageAttribute(targets[0], 'aria-label') !== key || definitions.get(key) !== text) {
      failures.push(`Home navigation actual ${id} must bind its native ${tag} and authoritative ${key} English name`)
    }
  }
  return failures
}
