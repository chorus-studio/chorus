interface DocumentPictureInPictureWindow extends Window {
    document: Document
}

interface DocumentPictureInPicture {
    requestWindow(options?: {
        width?: number
        height?: number
    }): Promise<DocumentPictureInPictureWindow>
    exit(): Promise<void>
}

interface Window {
    documentPictureInPicture: DocumentPictureInPicture
}

interface Document {
    documentPictureInPicture: DocumentPictureInPicture
}
