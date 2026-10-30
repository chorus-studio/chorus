interface DocumentPictureInPictureWindow extends Window {
    document: Document
}

interface DocumentPictureInPicture {
    requestWindow(options?: {
        width?: number
        height?: number
        /** Open at width/height instead of the size the user last dragged the window to (Chrome 126+). */
        preferInitialWindowPlacement?: boolean
    }): Promise<DocumentPictureInPictureWindow>
    exit(): Promise<void>
}

interface Window {
    documentPictureInPicture: DocumentPictureInPicture
}

interface Document {
    documentPictureInPicture: DocumentPictureInPicture
}
