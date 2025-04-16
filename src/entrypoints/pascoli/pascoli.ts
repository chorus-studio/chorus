import ModulePascoli from '@mellowtel/module-pascoli'

let modulePascoli
;(async () => {
    modulePascoli = new ModulePascoli()
    await modulePascoli.init()
})()
