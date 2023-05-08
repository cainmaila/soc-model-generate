import { useLayoutEffect, useState } from 'react'

const reader = new FileReader()
export const useDragFileUpload = (dropbox: HTMLElement | null) => {
  const [data, setData] = useState<string | ArrayBuffer | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [off, setOff] = useState<boolean>(true)

  useLayoutEffect(() => {
    dropbox?.addEventListener('dragenter', dragenter, false)
    dropbox?.addEventListener('dragover', dragover, false)
    dropbox?.addEventListener('drop', drop, false)

    function dragenter(e: DragEvent) {
      e.stopPropagation() //終止事件傳導
      e.preventDefault() //終止預設行為
    }

    function dragover(e: DragEvent) {
      e.stopPropagation() //終止事件傳導
      e.preventDefault() //終止預設行為
    }

    function drop(e: DragEvent) {
      e.stopPropagation() //終止事件傳導
      e.preventDefault() //終止預設行為
      off && e.dataTransfer && handleFiles(e.dataTransfer.files)
    }

    function handleFiles(files: FileList) {
      setData(null)
      setIsLoading(true)
      reader.onload = (e) => {
        setData(e.target?.result || null)
        setIsLoading(false)
      }
      reader.readAsDataURL(files[0])
    }

    return () => {
      dropbox?.removeEventListener('dragenter', dragenter, false)
      dropbox?.removeEventListener('dragover', dragover, false)
      dropbox?.removeEventListener('drop', drop, false)
    }
  }, [dropbox, off])

  return { data, isLoading, setOff }
}
