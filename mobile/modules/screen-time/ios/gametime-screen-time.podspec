require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'gametime-screen-time'
  s.version        = package['version']
  s.summary        = 'Gametime Family Controls / Screen Time native bridge'
  s.description    = 'Expo native module for FamilyControls authorization, FamilyActivityPicker, and ManagedSettings shields.'
  s.license        = 'UNLICENSED'
  s.author         = 'Gametime'
  s.homepage       = 'https://github.com/gametime'
  s.platforms      = { :ios => '16.0' }
  s.swift_version  = '5.9'
  s.source         = { :git => 'https://github.com/gametime/gametime.git' }
  s.static_framework = true

  s.source_files = '**/*.{h,m,swift}'
  s.frameworks = 'FamilyControls', 'ManagedSettings'

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end
