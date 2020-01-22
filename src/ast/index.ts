import {CallExpression, Expression, FunctionDeclaration, Node, StringCallExpression} from 'moonsharp-luaparse'
import {Chunk} from 'moonsharp-luaparse'

export type RequireExpression = CallExpression | StringCallExpression

// Traversal is stopped if `callback` returns `true`
export function reverseTraverse(node: Node, callback: (node: Node) => boolean | undefined): boolean {
	for (const property of Object.values(node)) {
		if (property && typeof property === 'object') {
			if (property instanceof Array) {
				if (property.length > 0 && property[0].type) {
					for (let i = property.length - 1; i >= 0; i--) {
						if (reverseTraverse(property[i], callback)) {
							return true
						}
					}
				}
			} else if (property.type) {
				if (reverseTraverse(property, callback)) {
					return true
				}
			}
		}
	}

	return callback(node) || false
}

function isRequireCall(node: Node): node is RequireExpression {
	return (node.type === 'CallExpression' || node.type === 'StringCallExpression')
		&& node.base.type === 'Identifier'
		&& node.base.name === 'require'
		&& (node.type === 'StringCallExpression' || node.arguments.length === 1)
}

export function reverseTraverseRequires(node: Node, callback: (expression: RequireExpression) => boolean | undefined | void): void {
	reverseTraverse(node, node => {
		return isRequireCall(node) && callback(node) === true
	})
}

function isModuleRegistration(expression: Expression, registerIdentifier: string): expression is CallExpression {
	return expression.type === 'CallExpression'
		&& expression.arguments.length === 2
		&& expression.base.type === 'Identifier'
		&& expression.base.name === registerIdentifier
}

export function iterateModuleRegistrations(chunk: Chunk, registerIdentifier: string, callback: (name: string, body: FunctionDeclaration) => boolean | undefined | void): void {
	const statementCount = chunk.body.length
	for (let i = 0; i < statementCount; i++) {
		const node = chunk.body[i]

		if (node.type === 'CallStatement') {
			if (isModuleRegistration(node.expression, registerIdentifier)) {
				const nameArgument = node.expression.arguments[0]
				const bodyArgument = node.expression.arguments[1]

				if (nameArgument.type === 'StringLiteral' && bodyArgument.type === 'FunctionDeclaration') {
					if (callback(nameArgument.value, bodyArgument)) {
						return
					}
				}
			}
		}
	}
}
