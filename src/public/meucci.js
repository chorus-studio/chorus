import ModuleMeucci from '@mellowtel/module-meucci'

let moduleMeucci
;(async () => {
    moduleMeucci = new ModuleMeucci()
    await moduleMeucci.init()
})()
