"use client"

import { useEffect } from "react"
import { useNavStore } from "../state/navigationState"

export default function NavigationController(){

  const setZoom = useNavStore(s=>s.setZoom)

  useEffect(()=>{

    const wheel = (e:WheelEvent)=>{

      useNavStore.setState((state)=>{

        let next = state.zoomLevel

        if(e.deltaY > 0){
          next = Math.min(2,next+1)
        }else{
          next = Math.max(0,next-1)
        }

        return { zoomLevel:next }

      })

    }

    window.addEventListener("wheel",wheel)

    return ()=>{
      window.removeEventListener("wheel",wheel)
    }

  },[])

  return null
}
