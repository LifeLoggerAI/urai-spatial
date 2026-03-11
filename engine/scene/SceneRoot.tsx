"use client"

import EscapeController from "../input/EscapeController"

export default function SceneRoot({children}:{children:any}){

  return(
    <>
      <EscapeController/>
      {children}
    </>
  )

}
