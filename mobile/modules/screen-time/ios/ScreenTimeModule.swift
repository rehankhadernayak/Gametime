import ExpoModulesCore
import FamilyControls
import ManagedSettings

public class ScreenTimeModule: Module {
  public func definition() -> ModuleDefinition {
    Name("GametimeScreenTime")

    AsyncFunction("requestAuthorization") { () async throws -> Void in
      try await MainActor.run {
        try await AuthorizationCenter.shared.requestAuthorization(for: .individual)
      }
    }
  }
}
