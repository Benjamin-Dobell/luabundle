(function()
	local globalRequire = require
	local loadingPlaceholder = {[{}] = true}

	local modules = {}
	local loaded = {}

	local function register(name, body)
		if not modules[name] then
			modules[name] = body
		end
	end

	local function require(name)
		local loadedModule = loaded[name]

		if loadedModule then
			if loadedModule == loadingPlaceholder then
				return nil
			end
		else
			if not modules[name] then
				if not globalRequire then
					error('Tried to require \"' .. name .. '\", but no such module has been registered')
				else
					return globalRequire(name)
				end
			end

			loaded[name] = loadingPlaceholder
			loaded[name] = modules[name]()
		end

		return loadedModule
	end

	return register, require, modules, loaded
end)()
