const defaultText = `*changes are temporary and will <b><i>reset</i></b> unless saved. `

export const createResetText = (text = '') => `
    <p style="position:absolute;bottom:2.75rem;right:1rem;font-size:0.825rem;color:#fff;padding:4px 0;">
        ${text ? text : defaultText} 
    </span>
`
