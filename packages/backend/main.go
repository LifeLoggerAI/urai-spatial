package main

import (
	"encoding/json"
	"io/ioutil"
	"log"
	"net/http"
)

func main() {
	http.HandleFunc("/memories", memoriesHandler)
	log.Fatal(http.ListenAndServe(":8080", nil))
}

func memoriesHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case "GET":
		getMemories(w, r)
	case "POST":
		postMemories(w, r)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func getMemories(w http.ResponseWriter, r *http.Request) {
	data, err := ioutil.ReadFile("memories.json")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.Write(data)
}

func postMemories(w http.ResponseWriter, r *http.Request) {
	var memories []interface{}
	if err := json.NewDecoder(r.Body).Decode(&memories); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	data, err := json.MarshalIndent(memories, "", "  ")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if err := ioutil.WriteFile("memories.json", data, 0644); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
}
