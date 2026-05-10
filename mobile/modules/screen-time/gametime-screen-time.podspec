require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'gametime-screen-time'
  s.version        = package['version']
  s.summary        = 'Gametime Screen Time (Family Controls) Expo module'
  s.description    = 'Native Screen Time / Family Controls authorization for Gametime mobile.'
  s.license        = package['license']
  s.authors        = { 'Gametime' => 'https://github.com' }
  s.homepage       = 'https://github.com'
  s.platforms      = { :ios => '15.1' }
  s.swift_version  = '5.9'
  s.source         = { :path => '.' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.frameworks = 'FamilyControls', 'ManagedSettings'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = 'ios/**/*.{h,m,swift}'
end
