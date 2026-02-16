
import json

def generate_emotion_vector(archetype):
    if archetype == "Expansion":
        return {"valence": 0.7, "arousal": 0.8, "agency": 0.9} # Explorer
    elif archetype == "Contraction":
        return {"valence": -0.5, "arousal": 0.2, "agency": 0.1} # Near-Dormant
    elif archetype == "Architect":
        return {"valence": 0.4, "arousal": 0.5, "agency": 0.8} # Builder/Protector mix
    else:
        return {"valence": 0.0, "arousal": 0.3, "agency": 0.4} # Default

def simulate_relapse_data():
    data = []
    # 1. Establish a repeating cycle of Expansion and Contraction
    for i in range(3):
        for day in range(90):
            data.append(generate_emotion_vector("Expansion"))
        for day in range(90):
            data.append(generate_emotion_vector("Contraction"))

    # 2. Trigger a "Reinvention" event
    for day in range(180):
        data.append(generate_emotion_vector("Architect"))

    # 3. Inject data that causes a shift back to a "Contraction" archetype
    for day in range(90):
        data.append(generate_emotion_vector("Contraction"))

    return data

if __name__ == "__main__":
    relapse_data = simulate_relapse_data()
    with open("relapse_data.json", "w") as f:
        json.dump(relapse_data, f)

    print("Generated relapse_data.json")
