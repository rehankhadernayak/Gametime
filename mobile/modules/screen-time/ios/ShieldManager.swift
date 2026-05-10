import Foundation
import FamilyControls
import ManagedSettings

enum ShieldManager {
  @available(iOS 16.0, *)
  static func applyShield(selectionData: String) throws {
    guard let data = selectionData.data(using: .utf8) else {
      throw shieldError(code: 1, message: "Selection data could not be read as UTF-8.")
    }

    let selection: FamilyActivitySelection
    do {
      selection = try JSONDecoder().decode(FamilyActivitySelection.self, from: data)
    } catch {
      throw shieldError(code: 2, message: "Could not decode FamilyActivitySelection: \(error.localizedDescription)")
    }

    let store = ManagedSettingsStore()
    store.clearAllSettings()

    if selection.applicationTokens.isEmpty {
      store.shield.applications = nil
    } else {
      store.shield.applications = selection.applicationTokens
    }

    if selection.categoryTokens.isEmpty {
      store.shield.applicationCategories = .none
    } else {
      store.shield.applicationCategories = .specific(selection.categoryTokens)
    }

    if selection.webDomainTokens.isEmpty {
      store.shield.webDomains = .none
    } else {
      store.shield.webDomains = .specific(selection.webDomainTokens)
    }
  }

  @available(iOS 16.0, *)
  static func removeShield() {
    ManagedSettingsStore().clearAllSettings()
  }

  private static func shieldError(code: Int, message: String) -> NSError {
    NSError(domain: "GametimeScreenTime", code: code, userInfo: [NSLocalizedDescriptionKey: message])
  }
}
