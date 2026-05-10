import ExpoModulesCore
import FamilyControls

public final class ScreenTimeModule: Module {
  public func definition() -> ModuleDefinition {
    Name("GametimeScreenTime")

    AsyncFunction("requestAuthorization") { () async throws -> Bool in
      guard #available(iOS 16.0, *) else {
        throw Self.unsupportedOS()
      }
      try await AuthorizationCenter.shared.requestAuthorization(for: .individual)
      return AuthorizationCenter.shared.authorizationStatus == .approved
    }

    AsyncFunction("applyShield") { (selectionData: String) throws -> Void in
      guard #available(iOS 16.0, *) else {
        throw Self.unsupportedOS()
      }
      try ShieldManager.applyShield(selectionData: selectionData)
    }

    AsyncFunction("removeShield") { () throws -> Void in
      guard #available(iOS 16.0, *) else {
        throw Self.unsupportedOS()
      }
      ShieldManager.removeShield()
    }

    View(FamilyPickerContainerView.self) {
      Events("onSelectionChange")
    }
  }

  private static func unsupportedOS() -> NSError {
    NSError(
      domain: "GametimeScreenTime",
      code: 0,
      userInfo: [NSLocalizedDescriptionKey: "Family Controls requires iOS 16 or later."]
    )
  }
}
