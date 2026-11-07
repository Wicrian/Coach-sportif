// Fabrique des fichiers audio avec une voix de ton Mac (y compris les voix « naturelles » de Siri téléchargées
// dans Réglages Système › Accessibilité › Contenu énoncé). Tout reste sur ton Mac.
//
// Usage :
//   swift outils/rendre-voix-mac.swift --liste [fr]
//   swift outils/rendre-voix-mac.swift <identifiant-voix> <dossier-sortie> <fichier.json>
// Le fichier JSON est une liste d'objets { "id": "coup:jab", "texte": "Jab" } ; on obtient un « coup-jab.caf » par entrée.
import AVFoundation
import Foundation

let args = CommandLine.arguments

if args.count >= 2 && args[1] == "--liste" {
    let prefixe = args.count >= 3 ? args[2] : ""
    let noms: [Int: String] = [1: "normale", 2: "améliorée", 3: "premium"]
    for v in AVSpeechSynthesisVoice.speechVoices().filter({ $0.language.hasPrefix(prefixe) }).sorted(by: { $0.quality.rawValue > $1.quality.rawValue }) {
        print("\(noms[v.quality.rawValue] ?? "?")\t\(v.name)\t\(v.language)\t\(v.identifier)")
    }
    exit(0)
}

guard args.count >= 4, let voix = AVSpeechSynthesisVoice(identifier: args[1]) else {
    print("Usage : swift rendre-voix-mac.swift <identifiant-voix> <dossier-sortie> <fichier.json>   (ou --liste fr)")
    exit(1)
}
let dossier = URL(fileURLWithPath: args[2])
try? FileManager.default.createDirectory(at: dossier, withIntermediateDirectories: true)
guard let donnees = try? Data(contentsOf: URL(fileURLWithPath: args[3])),
      let clips = try? JSONSerialization.jsonObject(with: donnees) as? [[String: String]] else {
    print("fichier JSON illisible")
    exit(1)
}

let synth = AVSpeechSynthesizer()
for clip in clips {
    guard let id = clip["id"], let texte = clip["texte"] else { continue }
    let u = AVSpeechUtterance(string: texte)
    u.voice = voix
    var fichier: AVAudioFile?
    var termine = false
    let sortie = dossier.appendingPathComponent(id.replacingOccurrences(of: ":", with: "-") + ".caf")
    synth.write(u) { buffer in
        guard let b = buffer as? AVAudioPCMBuffer else { return }
        if b.frameLength == 0 { termine = true; return }
        if fichier == nil { fichier = try? AVAudioFile(forWriting: sortie, settings: b.format.settings) }
        try? fichier?.write(from: b)
    }
    let limite = Date().addingTimeInterval(20)
    while !termine && Date() < limite { RunLoop.main.run(until: Date().addingTimeInterval(0.05)) }
    print("ok \(id)")
}
