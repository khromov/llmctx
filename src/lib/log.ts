import { dev } from '$app/environment'

export const log = (...props: unknown[]) => {
	if (false) {
		console.log(...props)
	}
}

export const logWarning = (...props: unknown[]) => {
	if (dev) {
		console.warn(...props)
	}
}

export const logError = (...props: unknown[]) => {
	if (dev) {
		console.error(...props)
	}
}

export const logAlways = (...props: unknown[]) => {
	console.log(...props)
}

export const logWarningAlways = (...props: unknown[]) => {
	console.warn(...props)
}

export const logErrorAlways = (...props: unknown[]) => {
	console.error(...props)
}
