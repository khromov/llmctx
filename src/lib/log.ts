import { dev } from '$app/environment'

export const log = (...props: any[]) => {
	if (dev) {
		console.log(...props)
	}
}

export const logWarning = (...props: any[]) => {
	if (dev) {
		console.warn(...props)
	}
}

export const logError = (...props: any[]) => {
	if (dev) {
		console.error(...props)
	}
}

export const logAlways = (...props: any[]) => {
	console.log(...props)
}

export const logWarningAlways = (...props: any[]) => {
	console.warn(...props)
}

export const logErrorAlways = (...props: any[]) => {
	console.error(...props)
}
