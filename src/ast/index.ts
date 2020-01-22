import {CallExpression, FunctionDeclaration, Node, StringCallExpression} from 'moonsharp-luaparse'
import {Chunk} from 'moonsharp-luaparse'

export type RequireExpression = CallExpression | StringCallExpression

export function reverseTraverse(node: Node, callback: (node: Node) => boolean | undefined): boolean {
	const anyNode = node as any
	const children = anyNode.body
		|| anyNode.clauses
		|| anyNode.init
		|| (anyNode.expression ? [anyNode.expression] : [])

	for (let i = children.length - 1; i >= 0; i--) {
		if (reverseTraverse(children[i], callback)) {
			return true
		}
	}

	callback(node)
	return false
}

export function reverseTraverseRequires(node: Node, requireIdentifier: string, callback: (expression: RequireExpression) => boolean | undefined | void): void {
	reverseTraverse(node, node => {
		if (node.type === 'CallExpression' || node.type === 'StringCallExpression') {
			const callExpression = node as RequireExpression
			if (callExpression.base.type === 'Identifier'
				&& callExpression.base.name === requireIdentifier
				&& ((callExpression as StringCallExpression).argument || (callExpression as CallExpression).arguments?.length === 1)) {
				return callback(callExpression) === true
			}
		}

		return false
	})
}

export function iterateModuleRegistrations(chunk: Chunk, registerIdentifier: string, callback: (name: string, body: FunctionDeclaration) => boolean | undefined | void): void {
	const statementCount = chunk.body.length
	for (let i = 0; i < statementCount; i++) {
		const node = chunk.body[i]

		if (node.type === 'CallStatement') {
			const expression = node.expression

			if (expression.type === 'CallExpression') {
				if (expression.base.type === 'Identifier' && expression.base.name === registerIdentifier && expression.arguments.length === 2) {
					const nameArgument = expression.arguments[0]
					const bodyArgument = expression.arguments[1]

					if (nameArgument.type === 'StringLiteral' && bodyArgument.type === 'FunctionDeclaration') {
						if (callback(nameArgument.value, bodyArgument)) {
							return
						}
					}
				}
			}
		}
	}
}
